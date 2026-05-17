---
name: purchase-flow
description: Sinav Salonu satın alma sürecinin uçtan uca akışı. CANDIDATE bir TestPackage satın alır; checkout, ödeme provider, webhook, kütüphaneye eklenme, iade ve indirim kodu senaryolarını kapsar. Satın alma butonu, checkout sayfası, webhook handler, "kütüphanem" sayfası, iade akışı gibi konular üzerinde çalışırken referans alın.
---

# Satın Alma Süreci — Uçtan Uca

## Önce Şunları Bil

- **Satın alma birimi: TestPackage.** Tekil Test satılmaz.
- **Satın alan: CANDIDATE.** EDUCATOR ve ADMIN paket satın almaz.
- **Kayıt: Purchase** entity, `(userId, testPackageId)` unique.
- Detaylı entity/iş kuralı için `exam-domain` skill'i.
- Provider entegrasyonu (Stripe/iyzico/PayTR) için `payment-domain` skill'i.

## Akış Şeması

```
CANDIDATE  →  Paket Listesi  →  Paket Detayı  →  [Sepete Ekle/Satın Al]
                                                       │
                                                       ▼
                                            Checkout Sayfası
                                            • Amount hesaplama
                                            • DiscountCode uygula (ops.)
                                            • Provider session yarat
                                            • Purchase PENDING kaydı
                                                       │
                                                       ▼
                                            Provider'a Yönlendir
                                            (Stripe Checkout / iyzico)
                                                       │
                                       ┌───────────────┴───────────────┐
                                       ▼                               ▼
                              Webhook: payment.succeeded     Webhook: payment.failed
                              • Purchase PAID                • Purchase FAILED
                              • paidAt, providerRef          • Log + CANDIDATE'a mesaj
                              • DiscountCode usageCount++
                                       │
                                       ▼
                              CANDIDATE /library'ye yönlendirilir
                              • Cache invalidate ['purchases'], ['packages']
                              • "Kütüphanem"de paket görünür
                              • İçindeki testler için Attempt açılabilir
```

## Aşamalara Göre Sorumluluk

### Aşama 1 — Paket keşif (browse + detay)

**Frontend** (`ui-builder` agent + `react-component` skill):
- Sayfa: `apps/frontend/src/pages/PackageListPage.jsx`, `PackageDetailPage.jsx`
- `useQuery({ queryKey: ['packages', filter], queryFn: () => dalClient.packages.list(filter) })`
- CANDIDATE için "Satın Al" butonu. EDUCATOR / ADMIN için butonu **gösterme** (rol kontrolü `routeRoles.js` ya da component içinde).
- Kullanıcı kendi paketini görüyorsa "Düzenle" göster, "Satın Al" gösterme.

**Backend** (`backend-architect` agent + `nestjs-module` skill):
- `GET /api/packages` — public, yayımlanmış paketleri liste
- `GET /api/packages/:id` — public, tek paket detay
- Response shape: `id, title, description, price, testCount, educatorName, publishedAt`

**Domain kuralı:** Yayımlanmamış paket listede ve detayda **gözükmez** (educator hariç — kendi taslakları).

### Aşama 2 — Checkout

**Frontend:**
- Sayfa: `CheckoutPage.jsx`
- DiscountCode input (opsiyonel)
- "Ödemeye Geç" butonu

```jsx
const checkout = useMutation({
  mutationFn: ({ packageId, discountCode }) => dalClient.purchases.checkout({ packageId, discountCode }),
  onSuccess: ({ redirectUrl }) => {
    window.location.href = redirectUrl;  // provider'a yönlendir
  },
  onError: (err) => {
    if (err.code === 'DISCOUNT_INVALID') setFormError('İndirim kodu geçersiz veya süresi dolmuş');
    else if (err.code === 'ALREADY_PURCHASED') setFormError('Bu paketi zaten satın aldınız');
    else if (err.code === 'OWN_PACKAGE') setFormError('Kendi paketinizi satın alamazsınız');
    else setFormError(err.message);
  },
});
```

**Backend** (Use Case: `CheckoutPurchaseUseCase`):
1. CANDIDATE mi? (auth + role check)
2. Paket var, yayımda mı?
3. Educator kendi paketi mi? → ForbiddenException
4. Aynı kullanıcı zaten almış mı? (status `PAID`) → ConflictException
5. DiscountCode geldiyse: validate (aktif, usage limit, paket eşleşmesi)
6. Final amount hesapla
7. Ücretsiz mi (`finalAmount === 0`)? → provider atla, doğrudan `PAID` kaydı (Aşama 4'e atla)
8. `prisma.$transaction`:
   - Eski PENDING varsa cancel et (idempotency)
   - Purchase yarat: `status = PENDING`, `amount = finalAmount`, `discountCodeId`
   - PaymentEvent tablosuna initiate event'i yaz
9. Provider session yarat (`payment-domain` skill — provider interface)
10. `redirectUrl` dön

**Hata case'leri (`error-handling` skill):**
- Paket yok → 404 `NOT_FOUND`
- Yayımlanmamış → 400 `NOT_PUBLISHED`
- Kendi paketi → 403 `OWN_PACKAGE`
- Zaten alınmış → 409 `ALREADY_PURCHASED`
- DiscountCode geçersiz → 400 `DISCOUNT_INVALID`
- Provider hatası → 502 `PROVIDER_ERROR` (5xx mapping)

### Aşama 3 — Ödeme (provider tarafında)

CANDIDATE browser'da provider sayfasına yönlenir, ödemeyi tamamlar. Bu aşamada uygulamamız "bekliyor".

`payment-domain` skill'ine bak — provider-agnostic interface, fixture mock, test pattern'leri.

### Aşama 4 — Webhook (ödeme onayı)

**Backend** (Controller: `PaymentWebhookController`, Use Case: `HandlePaymentWebhookUseCase`):

```ts
@Post('webhook')
@Public()  // Provider çağırıyor, kullanıcı auth yok
async webhook(@Body() rawBody: string, @Headers('stripe-signature') sig: string) {
  const event = this.provider.verifyWebhook(rawBody, sig);
  if (!event) throw new BadRequestException('Invalid signature');
  return this.handlePaymentWebhookUseCase.execute(event);
}
```

**Use Case akışı:**
1. **Idempotency:** `paymentEvent.findUnique({ providerEventId: event.id })` — varsa zaten işlenmiş, sessiz return.
2. `prisma.$transaction`:
   - PaymentEvent kaydı yarat (idempotency lock).
   - Event türüne göre:
     - `checkout.completed` / `payment.succeeded` → Purchase'ı bul (`testPackageId + userId`), `status = PAID`, `paidAt = now()`, `providerRef = event.paymentId`. DiscountCode varsa `usageCount++`.
     - `payment.failed` → Purchase `status = FAILED`, log için error reason yaz.
     - `payment.refunded` → Purchase `status = REFUNDED`, `refundedAt = now()`.

**Hata case'leri:**
- Imza doğrulanamadı → 400 (provider tekrar dener)
- Purchase bulunamadı (race condition) → 200 dön + log warn (`payment_event_orphan`)
- DB hatası → 500 (provider tekrar dener; idempotency lock korur)

**Önemli:** Webhook **at-least-once** garanti verir. Aynı event 2-3 kez gelebilir. Idempotency kontrolü olmazsa Purchase çift güncellenir, DiscountCode usage iki kez artar.

### Aşama 5 — Kullanıcı dönüşü (success URL)

Provider CANDIDATE'ı bizim success URL'imize yönlendirir (`/checkout/success?session=xxx`).

**Frontend:**
- Sayfa: `CheckoutSuccessPage.jsx`
- `useQuery({ queryKey: ['purchases', sessionId], queryFn: () => dalClient.purchases.getBySession(sessionId) })`
- Eğer Purchase `PAID` → "Tebrikler, kütüphanenizde" + Link to library
- Eğer `PENDING` (webhook henüz gelmedi) → polling: 2 saniyede bir refetch, max 30 saniye. Sonra "Ödemeniz işleniyor, kütüphanenizde göreceksiniz."
- Eğer `FAILED` → hata mesajı + tekrar dene butonu

**Cache invalidate:**
```js
queryClient.invalidateQueries({ queryKey: ['purchases'] });
queryClient.invalidateQueries({ queryKey: ['library'] });
```

### Aşama 6 — Kütüphane

**Frontend:**
- Sayfa: `LibraryPage.jsx`
- `useQuery({ queryKey: ['library'], queryFn: () => dalClient.purchases.myLibrary() })`
- Her paket için "Çöz" butonları (paketteki testleri liste)

**Backend:**
- `GET /api/purchases/library` — auth CANDIDATE, kendi `PAID` Purchase'larını + her birindeki TestPackage + içindeki Test'leri döner.

### Aşama 7 — Test çözme (post-purchase)

**Frontend:**
- CANDIDATE bir Test için "Başla" tıklar.
- `POST /api/attempts/start { examTestId }` → AttemptID döner.

**Backend** (Use Case: `StartAttemptUseCase`):
- CANDIDATE'ın `userId`'si için, **bu Test'i içeren herhangi bir TestPackage'a** `PAID` Purchase var mı?
  ```ts
  const hasAccess = await this.purchaseRepo.userOwnsPackageContaining(userId, examTestId);
  if (!hasAccess) throw new ForbiddenException('Bu testi çözmek için paketi satın alın');
  ```
- Aktif IN_PROGRESS attempt var mı? Varsa onu dön (resume), yoksa yeni Attempt yarat.

### Aşama 8 — İade

**Frontend:**
- ADMIN paneli veya CANDIDATE self-service (politikaya göre)
- `POST /api/purchases/:id/refund { reason }` mutation

**Backend** (Use Case: `RefundPurchaseUseCase`):
1. Purchase var, `status = PAID` mı?
2. Iade süresi geçmedi mi (örn. 14 gün — politikaya göre, AdminSettings'te tutulabilir)?
3. Provider'a iade isteği gönder (`payment-domain` skill).
4. Başarılıysa `prisma.$transaction`:
   - Purchase `status = REFUNDED`, `refundedAt`, `refundProviderRef`, `refundReason`
   - DiscountCode kullanılmışsa `usageCount--` (politika)
5. Mevcut Attempt'lere dokunma — geçmiş skor kalır.
6. CANDIDATE yeni Attempt açamaz çünkü Purchase artık `PAID` değil.

## Senaryolar

### Happy path
1. CANDIDATE paket listesine bakar, bir paketi açar.
2. "Satın Al" → CheckoutPage.
3. (Opsiyonel) DiscountCode girer, "Uygula" → frontend backend'e validate eder, indirim gözükür.
4. "Ödemeye Geç" → backend Purchase PENDING + provider session, CANDIDATE provider'a yönlenir.
5. CANDIDATE öder, success URL'e döner. Provider webhook'u gönderir, Purchase PAID olur.
6. CANDIDATE kütüphanesinde paketi görür, içindeki testleri çözebilir.

### DiscountCode geçersiz (expired)
1. CANDIDATE kodu CheckoutPage'de girer.
2. Backend validate eder: `validUntil < now()` → 400 `DISCOUNT_INVALID`.
3. Frontend `setFormError('İndirim kodu geçersiz veya süresi dolmuş')`.
4. CANDIDATE kod olmadan devam edebilir.

### Çift sekme / çift tıklama
- Frontend `disabled={mutation.isPending}` → tek tıklama.
- İki sekmede aynı anda CheckoutPage açtıysa:
  - İlk submit Purchase PENDING yaratır.
  - İkinci submit aynı kullanıcı + paket → backend'de "PENDING zaten var" durumu. Eski PENDING'i cancel + yeni PENDING (idempotency) veya mevcut session URL'i dön. Strateji uygulamaya göre.
- Webhook geldiğinde sadece bir Purchase PAID olur, diğeri PENDING/FAILED kalır → cron temizler.

### Provider fail
- Webhook `payment.failed` event gönderir.
- Use Case Purchase `FAILED` yapar, log'a yazar.
- Frontend success URL'de polling sırasında `FAILED` görürse "Ödemeniz başarısız, tekrar deneyin" gösterir.
- CANDIDATE yeni checkout başlatabilir — eski PENDING/FAILED Purchase yeni session ile değiştirilir (status update veya yeni satır, uygulamaya göre).

### EDUCATOR kendi paketini satın almaya kalkar
- Frontend: butonu zaten gizliyoruz.
- Backend defense in depth: `CheckoutPurchaseUseCase` `educator.id === userId` ise `ForbiddenException`.

### Ücretsiz paket
- `package.price === 0` ise checkout sırasında provider atlanır.
- Direkt `Purchase` `PAID` oluşturulur (audit için).
- CANDIDATE'a "kütüphanenize eklendi" mesajı.

### Webhook gecikmesi
- Kullanıcı success URL'e döndüğünde Purchase hala PENDING olabilir.
- Frontend 30 saniyeye kadar polling (2s aralık).
- Polling sonunda PENDING ise "İşleniyor, kütüphanenizde göreceksiniz" — kullanıcı bekletmeyi başkasına bırakır.
- Webhook geldiğinde TanStack Query background refetch tetiklenir (`refetchInterval` veya manuel invalidate).

### İade sonrası tekrar satın alma
- İade edilmiş Purchase `REFUNDED` durumdadır.
- Aynı kullanıcı aynı paketi tekrar satın almak isterse:
  - Unique constraint `(userId, testPackageId)` çakışır.
  - Strateji: yeni Purchase yerine eski satırı `PENDING`'e geri çevir (status reset) veya `cancelledAt` ekleyip yeni satıra izin ver. Uygulamaya göre karar.

## Hata Tanı Tablosu

| Belirti | Olası sebep | Bakılacak yer |
|---------|-------------|---------------|
| "Satın Al" butonu pasif | rol check ya da paket yayımda değil | routeRoles, package.publishedAt |
| Checkout 409 dönüyor | aynı paket zaten alınmış | Purchase tablosunda PAID satır var mı |
| Provider'a yönlenmedi | Provider session response shape yanlış | dalClient + backend response uyumu, `api-contract` skill |
| Kütüphanede paket gözükmüyor | Cache invalidate edilmedi | `queryClient.invalidateQueries(['library'])`, `form-mutation` skill |
| Webhook geldi ama Purchase PENDING | Idempotency lock alındı ama update fail | PaymentEvent loglarına bak, transaction içinde mi |
| Aynı paket çift PAID kayıt | Webhook idempotency yok | PaymentEvent unique kontrolü, `payment-domain` skill |
| DiscountCode usage limit aşıldı ama satış oluştu | Webhook'ta usageCount artırılırken validation yok | Use Case'te recheck |
| CANDIDATE iade sonrası test çözüyor | Attempt yetki kontrolü `PAID` yerine `ANY` bakıyor | `StartAttemptUseCase` Purchase status filter |

## Test'ler

### Use Case Unit (Jest)
- CheckoutPurchaseUseCase: rol, owner, duplicate, discount, ücretsiz, provider error case'leri
- HandlePaymentWebhookUseCase: idempotency, success, failed, refund event'leri
- StartAttemptUseCase: hiç purchase, REFUNDED purchase, PAID purchase, paket dışı test case'leri
- RefundPurchaseUseCase: PAID değil, süre geçmiş, başarılı iade, provider fail

### Controller e2e (Jest + supertest)
- `POST /api/purchases/checkout`: 401, 400 (geçersiz body), 403 (own package), 409 (duplicate), 200 başarı
- `POST /api/payments/webhook`: 400 (invalid signature), 200 (success), idempotency (aynı event 2 kez)
- `POST /api/attempts/start`: 401, 403 (paket yok), 200 başarı

### Frontend (Vitest + Testing Library)
- CheckoutPage: discount valid/invalid, "Ödemeye Geç" mutation pending/success/error
- CheckoutSuccessPage: polling PENDING → PAID transition
- LibraryPage: kütüphane render, cache invalidate sonrası yeni paket görünür

### E2e (Playwright)
- Mock provider ile: full happy path (browse → checkout → success → library → attempt → submit)
- Discount expired sırasında: hata UI'da görünür
- Provider 500 simülasyonu: error gösterilir, buton sıfırlanır
- İade akışı (admin paneli üzerinden)

## Skill Referansları (Her Aşamada)

| Aşama | Skill |
|-------|-------|
| Domain kuralları, entity yapısı | `exam-domain` |
| Provider entegrasyonu, webhook | `payment-domain` |
| Backend Use Case + Controller + DTO | `nestjs-module` |
| Schema değişikliği | `prisma-schema` + `migration-planner` |
| Endpoint sözleşmesi + dalClient | `api-contract` |
| Frontend component / sayfa | `react-component` |
| Form / mutation / cache invalidate | `form-mutation` |
| Hata yönetimi (4xx/5xx) | `error-handling` |
| Eski yapıyı bozmama | `backward-compatibility` |
| Unit/integration/e2e test | `tdd-workflow` |

## Kritik Kurallar (Özet)

1. **Satın alma birimi TestPackage** — tekil Test satılmaz, Purchase `testPackageId`'ye bağlı.
2. **Sadece CANDIDATE satın alır.**
3. **EDUCATOR kendi paketini alamaz** (defense in depth: frontend + backend).
4. **DB unique constraint `(userId, testPackageId)`** çift satın almayı engeller.
5. **Webhook idempotency olmadan deploy etme.**
6. **Purchase + Payment hep aynı transaction.**
7. **DiscountCode validation hem checkout'ta hem webhook'ta** (race condition).
8. **İade sonrası Attempt'lere dokunma**, sadece yeni Attempt erişimini kapat.
9. **Test çözme yetkisi:** `userOwnsPackageContaining(userId, examTestId)` — Purchase status `PAID`.
10. **AdPurchase ayrı bir akış** — TestPackage Purchase ile karıştırma.
