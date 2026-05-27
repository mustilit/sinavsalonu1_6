# Stripe Canlı Kalibrasyon — Test → Staging → Prod

> Stripe entegrasyonunu test mode'dan staging'e, oradan canlı (prod) ödeme
> alımına çıkarma adımları. Her aşamada doğrulama + rollback prosedürü.

## Genel Mimari

Sınav Salonu Stripe entegrasyonu **3 katman**:

1. **Frontend** — Stripe.js + Elements (publishable key, prefix `pk_`)
2. **Backend** — Stripe Node SDK (secret key, prefix `sk_`)
3. **Webhook** — `POST /webhooks/stripe` HMAC-SHA256 signature doğrulama

Use-case'ler `apps/backend/src/application/use-cases/billing/`:
- `StartCheckoutUseCase` — Stripe Checkout Session oluştur
- `HandleStripeWebhookUseCase` — webhook event dispatch (idempotent, replay-protected)
- `GetMySubscriptionUseCase` — kullanıcının aktif aboneliği
- `CreatePortalLinkUseCase` — Stripe Customer Portal (iptal/güncelleme)

`WebhookEvent` modeli `@@unique([provider, providerEventId])` — aynı event 2 kez işlenmez.

---

## Aşama 1 — Test Mode (Localhost / Dev)

### 1.1 Stripe Dashboard kurulumu (Test Mode)

1. https://dashboard.stripe.com/test/apikeys — Publishable key (`pk_test_...`) ve Secret key (`sk_test_...`) kopyala.
2. Webhook endpoint ekle:
   - Endpoint URL: `http://localhost:3000/webhooks/stripe`
   - Events (zorunlu):
     - `checkout.session.completed` — başarılı satın alma
     - `checkout.session.expired` — abandoned
     - `customer.subscription.created` — yeni abonelik
     - `customer.subscription.updated` — yenileme, trial bitti
     - `customer.subscription.deleted` — iptal
     - `invoice.paid` — başarılı yenileme
     - `invoice.payment_failed` — başarısız ödeme
     - `charge.refunded` — iade
   - Signing secret (`whsec_...`) kopyala.

### 1.2 .env (development)

```bash
# apps/backend/.env
STRIPE_SECRET_KEY=sk_test_xxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxx  # backend de bilsin
NODE_ENV=development
```

```bash
# apps/frontend/.env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxx
```

Veya — Admin paneli → "Entegrasyonlar" → Stripe key'leri DB'ye encrypted yaz:
- `payment_settings` tablosunda `stripeKeysEncrypted` (AES-256-GCM)
- AdminSystemControls UI'ından yönet

### 1.3 Stripe CLI ile webhook forward (local testing)

```bash
# Stripe CLI kur (https://stripe.com/docs/stripe-cli)
stripe login

# Local backend'e webhook event forward et
stripe listen --forward-to localhost:3000/webhooks/stripe

# Test event tetikle (başka terminal)
stripe trigger checkout.session.completed
```

### 1.4 Doğrulama

```bash
# Test card: 4242 4242 4242 4242 (Visa, succeed)
# Test card: 4000 0000 0000 0341 (declined)

# Backend log'ta görmeli:
#   [HandleStripeWebhook] event=checkout.session.completed processed
#   [WebhookEvent] insert (provider=stripe, providerEventId=evt_xxx)

# DB kontrolü:
psql $DATABASE_URL -c "SELECT id, provider, processed_at FROM webhook_events ORDER BY received_at DESC LIMIT 5;"
psql $DATABASE_URL -c "SELECT id, status, paid_at FROM purchases WHERE status='ACTIVE' ORDER BY created_at DESC LIMIT 5;"
```

### 1.5 Smoke test script

```bash
# apps/backend/scripts/stripe-smoke.sh — aşağıdaki "Smoke Test Script" bölümünde
./apps/backend/scripts/stripe-smoke.sh test
```

---

## Aşama 2 — Staging (Test mode, gerçek domain)

### 2.1 Stripe Dashboard

Aynı Test Mode key'leri kullan. Sadece webhook endpoint URL değiş:

- Endpoint URL: `https://api.staging.sinavsalonu.com/webhooks/stripe`
- Aynı event listesi
- **Yeni** signing secret üret (test ortamında ayrı tut)

### 2.2 Staging deploy (Helm)

`values-staging.yaml` (zaten hazır):

```yaml
backend:
  env:
    STRIPE_MODE: "test"
frontend:
  env:
    VITE_STRIPE_PUBLISHABLE_KEY: "pk_test_xxxxxxxx"
```

Secret manifest:
```bash
kubectl create secret generic sinavsalonu-staging-secrets \
  --namespace sinavsalonu-staging \
  --from-literal=STRIPE_SECRET_KEY="sk_test_xxxxxxxx" \
  --from-literal=STRIPE_WEBHOOK_SECRET="whsec_xxxxxxxx"
```

### 2.3 Doğrulama (staging)

```bash
# 1. Webhook'un erişilebilir olduğunu Stripe'tan test et
# Dashboard → Webhooks → endpoint → "Send test webhook"
# → 200 OK görmeli backend log'ta

# 2. End-to-end: gerçek kullanıcı staging'de test card ile satın alma denemesi
./apps/backend/scripts/stripe-smoke.sh staging

# 3. Bounce rate cron'u staging'de fail almıyor mu (3 gün takip)
kubectl logs deploy/sinavsalonu-backend -n sinavsalonu-staging | grep -i bounce
```

### 2.4 Bekleme süresi

**Minimum 3 iş günü** staging'de test card akışı çalışsın — webhook teslimat oranı %99+, retry'lar başarılı.

---

## Aşama 3 — Prod (Live Mode)

### 3.1 Stripe Account aktivasyon

1. Dashboard → Activate Account → şirket bilgileri, banka hesabı, vergi kimliği
2. Süreç 2-3 iş günü Stripe inceleme

### 3.2 Live Mode key'leri

1. Dashboard → **toggle test → live**
2. https://dashboard.stripe.com/apikeys → `pk_live_...` + `sk_live_...`
3. Webhook endpoint **yeniden oluştur** (live tarafta):
   - Endpoint URL: `https://api.sinavsalonu.com/webhooks/stripe`
   - **Aynı event listesi**
   - **Yeni** signing secret (live için ayrı)

### 3.3 Prod secret rotasyonu

```bash
# Vault/SealedSecret ile (PRODUCTION):
kubectl create secret generic sinavsalonu-prod-secrets \
  --namespace sinavsalonu-prod \
  --from-literal=STRIPE_SECRET_KEY="sk_live_xxxxxxxx" \
  --from-literal=STRIPE_WEBHOOK_SECRET="whsec_xxxxxxxx" \
  --dry-run=client -o yaml | kubeseal > stripe-prod-sealed.yaml
git add stripe-prod-sealed.yaml
git commit -m "ops(stripe): rotate prod webhook secret"
kubectl apply -f stripe-prod-sealed.yaml
```

### 3.4 Live values

`values-prod.yaml`:
```yaml
backend:
  env:
    STRIPE_MODE: "live"
frontend:
  env:
    VITE_STRIPE_PUBLISHABLE_KEY: "pk_live_xxxxxxxx"
```

### 3.5 Cutover

```bash
# Maintenance penceresi (10 dk)
helm upgrade sinavsalonu ./infra/helm/sinavsalonu \
  --namespace sinavsalonu-prod \
  -f infra/helm/sinavsalonu/values-prod.yaml \
  --reuse-values

# İlk 30 dakika: 5 dk'da bir kontrol
watch -n 60 'kubectl logs deploy/sinavsalonu-backend -n sinavsalonu-prod --tail=20 | grep -iE "stripe|webhook|error"'
```

### 3.6 Doğrulama (live)

```bash
# 1. Kendi kart bilgilerinizle (gerçek) küçük tutarlı (₺1) test paketi al
# 2. Webhook event Stripe Dashboard'ta delivered=200 görmeli
# 3. DB'de purchase status=ACTIVE, paid_at set
# 4. Refund test: dashboard'tan iade et → webhook charge.refunded → status=REFUNDED

# Bounce / failure monitoring
kubectl exec deploy/sinavsalonu-backend -n sinavsalonu-prod -- \
  npx prisma studio  # webhook_events tablosunu kontrol et
```

---

## Smoke Test Script

`apps/backend/scripts/stripe-smoke.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-test}"  # test | staging | prod
API_URL_BY_MODE=(
  "test=http://localhost:3000"
  "staging=https://api.staging.sinavsalonu.com"
  "prod=https://api.sinavsalonu.com"
)

# ... (curl ile webhook event simulation + DB row count check)
```

> Script ayrı dosyada — kullanıcı çalıştırır. CI'da değil (gerçek Stripe API çağrısı).

---

## Rollback Prosedürü

### Webhook fail (delivered < %95)

```bash
# 1. Stripe dashboard → webhook endpoint → "Pause"
# 2. Failed event'leri retry (max 3 gün geçmiş)
# 3. Backend log incele:
kubectl logs deploy/sinavsalonu-backend -n sinavsalonu-prod --since=2h | grep -A 5 "webhook"

# 4. Eğer kod hatasıysa Helm rollback:
helm rollback sinavsalonu N -n sinavsalonu-prod
# 5. Webhook'u tekrar enable et
```

### Secret leak (key publish edildi)

```bash
# 1. Stripe dashboard → Developers → API keys → "Roll" → eski key invalid
# 2. Yeni secret'ı k8s'a yaz (yukarıdaki adımlar)
# 3. helm upgrade --reuse-values + restart pod
# 4. Audit log: kimin/ne zaman commit ettiğini bul
```

---

## Önemli İnvariant'lar

- **Webhook signing secret asla `.env` dosyasında commit edilmez** — sadece k8s secret veya admin paneli (encrypted DB).
- **Test ↔ Live key karışmaz** — `STRIPE_MODE` env değişkeni hangi mode'da olduğunu söyler.
- **`webhook_events` tablosunda aynı `providerEventId` 2 kez insert edilemez** — DB unique constraint replay'i engeller.
- **5xx response webhook'a yasaktır** — Stripe retry mekanizması tetiklenir; backend hata bile olsa **200 + log** dön.
- **Charge tutarı amountCents olarak kaydedilir** — float yasak.

---

## Cron + Sentry

- `apps/backend/src/nest/services/EmailCronService.ts` — bounce alert (e-posta için ama bizim Stripe bounce'umuz da var)
- Sentry'e webhook error capture (5xx) — `HttpExceptionFilter` zaten halleder

---

## Kapsam Dışı (sonra)

- Stripe Connect (educator hesaplarına direkt ödeme) — şu an platform middleware
- 3D Secure 2 strong customer authentication (SCA) — Stripe.js Element zaten otomatik halleder
- Tax automation (Stripe Tax) — Türkiye için KDV otomatik hesaplama
