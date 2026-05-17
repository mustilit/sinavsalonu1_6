---
name: payment-domain
description: Ödeme sağlayıcı entegrasyonu için pattern — provider-agnostic interface, webhook idempotency, iade akışı, test modu. Stripe, iyzico, PayTR, amazonpay, googlepay gibi bir sağlayıcıyla ödeme akışı kurulurken veya değiştirilirken referans alın.
---

# Ödeme Entegrasyonu — Sinav Salonu

## Felsefe

Ödeme kodu en riskli kısım: yanlış giderse para kaybolur, çift tahsilat olur, kullanıcı satın aldığı sınavı göremez. Dört kural:

1. **Provider-agnostic interface.** Stripe/iyzico değiştirmek istediğinde bir dosyayı değiştirmen yetsin.
2. **Idempotency her yerde.** Webhook iki kez gelebilir, kullanıcı "satın al" tuşuna iki kez basabilir.
3. **Single source of truth = provider.** Bizim DB'miz "ne olduğunu sanıyoruz"u saklar; sağlayıcı "gerçekte ne oldu"yu bilir. Çatışırsa provider kazanır.
4. **Test modunda gerçek para asla dokunulmaz.** Env ile net ayır.

## Mimari

```
apps/backend/src/
  application/use-cases/purchase/
    CheckoutPurchaseUseCase.ts     → ödeme oturumu başlat
    HandlePaymentWebhookUseCase.ts → provider callback işle
    RefundPurchaseUseCase.ts       → iade akışı
  infrastructure/payment/
    payment-provider.interface.ts  → provider-agnostic arayüz
    stripe.provider.ts
    iyzico.provider.ts
    mock.provider.ts               → test
  nest/controllers/
    payment.controller.ts          → POST /checkout, POST /webhook
    dto/
      checkout-request.dto.ts
      webhook-payload.dto.ts
```

## Provider Interface

```ts
// providers/payment-provider.interface.ts
export interface CheckoutSession {
  id: string;
  url: string;      // kullanıcıyı yönlendireceğimiz URL
  expiresAt: Date;
}

export interface PaymentProvider {
  createCheckout(params: {
    amount: number;
    currency: string;
    userId: string;
    examId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSession>;

  verifyWebhook(rawBody: string, signature: string): WebhookEvent | null;

  refund(providerRef: string, amount: number): Promise<RefundResult>;
}
```

Sağlayıcı değişince sadece yeni bir `provider.ts` yazılır, service dokunulmaz.

## Checkout Akışı

```
1. Kullanıcı "Satın Al" → POST /checkout { examId }
2. Service:
   - Exam var mı, fiyat > 0 mı?
   - Kullanıcı kendi sınavını almaya mı çalışıyor?
   - Zaten satın almış mı?
   - provider.createCheckout(...) çağır
   - Purchase satırı 'PENDING' durumuyla yarat (idempotency key: userId+examId)
3. Kullanıcı provider URL'sine yönlenir, öder
4. Provider → webhook → POST /webhook
5. Webhook handler:
   - Signature doğrula
   - Event zaten işlenmiş mi? (idempotency)
   - Purchase 'PAID' yap, aynı transaction'da
```

## Webhook Idempotency

Provider'lar "at least once" garanti verir — aynı event 2-3 kez gelebilir.

```ts
// payment.service.ts
async handleWebhook(event: WebhookEvent) {
  const existing = await this.prisma.paymentEvent.findUnique({
    where: { providerEventId: event.id },
  });
  if (existing) return; // zaten işlendi

  await this.prisma.$transaction(async (tx) => {
    await tx.paymentEvent.create({
      data: { providerEventId: event.id, type: event.type, payload: event.raw },
    });

    if (event.type === 'checkout.completed') {
      await tx.purchase.update({
        where: { userId_examId: { userId: event.userId, examId: event.examId } },
        data: { status: 'PAID', paidAt: new Date(), amount: event.amount },
      });
    }
    // ...
  });
}
```

## Purchase Durumları

```
PENDING  → checkout oluşturuldu, ödeme bekleniyor
PAID     → webhook geldi, ödeme onaylandı
FAILED   → provider fail dedi (yetersiz bakiye, kart reddi)
REFUNDED → iade yapıldı
```

Geçişler tek yönlü: `PENDING → PAID → REFUNDED` veya `PENDING → FAILED`. Geri dönüş yok.

## Çift Tahsilat Koruması

İki yerde:

1. **DB constraint**: `Purchase (userId, examId)` unique. Kullanıcı aynı sınavı iki kez alamaz.
2. **Service check**: `createCheckout` öncesi `Purchase` var mı ve `PAID/PENDING` durumundaysa → checkout yaratma, var olan session'ı dön.

## İade Akışı

```ts
async refund(userId: string, examId: string, reason: string) {
  const purchase = await this.prisma.purchase.findUnique({
    where: { userId_examId: { userId, examId } },
  });
  if (!purchase || purchase.status !== 'PAID') {
    throw new BadRequestException('Refund yapılamaz');
  }

  const result = await this.provider.refund(purchase.providerRef, purchase.amount);

  await this.prisma.purchase.update({
    where: { userId_examId: { userId, examId } },
    data: {
      status: 'REFUNDED',
      refundedAt: new Date(),
      refundReason: reason,
      refundProviderRef: result.refundId,
    },
  });
}
```

**Önemli**: Attempt kayıtlarını silme — kullanıcı zaten sınavı çözmüş olabilir. Skorunu kaybetmesin, sadece erişimi kaldır.

## Test Stratejisi

- **Unit**: `MockProvider` inject et, her senaryoyu test et — başarılı, fail, webhook tekrarı.
- **Integration**: gerçek HTTP kurulu, mock provider webhook gönder.
- **E2e**: `cd apps/frontend && npm run test:e2e` — Playwright `page.route()` ile provider URL'si intercept, fake başarı yönlendirmesi.
- **Manuel** (provider test modunda): Stripe'ın test kart numaraları, iyzico sandbox.

**Gerçek para ortamında asla otomatik test çalıştırma.** `NODE_ENV=production` iken `MockProvider` kullanılamasın.

## Env Değişkenleri

```
PAYMENT_PROVIDER=stripe            # stripe | iyzico | mock
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
IYZICO_API_KEY=...
IYZICO_SECRET_KEY=...
PAYMENT_CURRENCY=TRY
PAYMENT_SUCCESS_URL=https://sinavsalonu.com/exam/:id/purchased
PAYMENT_CANCEL_URL=https://sinavsalonu.com/exam/:id
```

`.env.example`'a ekle, `.env`'yi **asla** commit etme.

## Güvenlik

- Webhook endpoint'i `@Public()` ama **signature doğrulama şart**. Başarısızsa 400 dön, log'la.
- Kullanıcı checkout isteği yaparken amount'u backend hesaplasın — client'tan gelen fiyata **asla güvenme**.
- Stripe ID'lerini (`cus_...`, `pi_...`) log'la, kart numarasını **asla**.
- PCI-DSS: kart bilgisini hiç tutma. Provider'ın hosted checkout'u veya tokenization kullan.

## Raporlama

Ödeme endpoint'i veya akışı yazıldığında:
1. Hangi dosyalar değişti.
2. Webhook endpoint'i açıksa signature doğrulama var mı.
3. Transaction kullanıldığı yerler.
4. İdempotency kontrolü olan yerler.
5. Test kapsamı — happy + fail + retry senaryosu.
