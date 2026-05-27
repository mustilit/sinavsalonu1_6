# Helm Staging Deploy — Runbook

> Sınav Salonu chart'ı staging Kubernetes cluster'a kurma + smoke test akışı.

## Ön Koşullar

- `kubectl` cluster context staging'e ayarlı (`kubectl config current-context`)
- `helm` v3.12+
- Docker image'ları GHCR'a push edilmiş:
  - `ghcr.io/mustilit/sinavsalonu1_6-backend:staging`
  - `ghcr.io/mustilit/sinavsalonu1_6-frontend:staging`
  - `ghcr.io/mustilit/sinavsalonu1_6-worker:staging`
- Namespace + secret'lar hazır (aşağıda)

---

## 1. Namespace + Secret hazırlığı (ilk kurulum)

```bash
# Namespace
kubectl create namespace sinavsalonu-staging

# Application secret'ları (PostgreSQL URL, JWT secret, vb.)
kubectl create secret generic sinavsalonu-staging-secrets \
  --namespace sinavsalonu-staging \
  --from-literal=DATABASE_URL="postgresql://USER:PASS@DB_HOST:5432/sinavsalonu_staging" \
  --from-literal=JWT_SECRET="$(openssl rand -hex 32)" \
  --from-literal=STRIPE_SECRET_KEY="sk_test_REPLACE_ME" \
  --from-literal=STRIPE_WEBHOOK_SECRET="whsec_REPLACE_ME" \
  --from-literal=EMAIL_SECRETS_KEY="$(openssl rand -hex 32)" \
  --from-literal=REDIS_URL="redis://redis:6379"

# GHCR pull secret (image private ise)
kubectl create secret docker-registry ghcr-pull \
  --namespace sinavsalonu-staging \
  --docker-server=ghcr.io \
  --docker-username=mustilit \
  --docker-password="${GHCR_PAT}" \
  --docker-email="ops@sinavsalonu.com"
```

---

## 2. Chart doğrulama (deploy etmeden)

```bash
# Şablon render — manifestleri görmek için
helm template sinavsalonu ./infra/helm/sinavsalonu \
  -f infra/helm/sinavsalonu/values-staging.yaml \
  --namespace sinavsalonu-staging | less

# Lint
helm lint ./infra/helm/sinavsalonu \
  -f infra/helm/sinavsalonu/values-staging.yaml

# Dry-run server (cluster validation)
helm install sinavsalonu ./infra/helm/sinavsalonu \
  -f infra/helm/sinavsalonu/values-staging.yaml \
  --namespace sinavsalonu-staging \
  --dry-run --debug
```

---

## 3. Deploy

```bash
helm upgrade --install sinavsalonu ./infra/helm/sinavsalonu \
  --namespace sinavsalonu-staging \
  --create-namespace \
  -f infra/helm/sinavsalonu/values-staging.yaml \
  --wait \
  --timeout 5m
```

> `--wait`: Tüm pod'lar Ready olana kadar bekler. Timeout aşılırsa rollout fail.

---

## 4. Doğrulama

```bash
# Pod durumu
kubectl get pods -n sinavsalonu-staging

# Beklenen:
#   sinavsalonu-backend-xxx        1/1 Running
#   sinavsalonu-frontend-xxx       1/1 Running
#   sinavsalonu-worker-xxx         1/1 Running
#   sinavsalonu-migrate-xxx        0/1 Completed

# Migration job log
kubectl logs job/sinavsalonu-migrate -n sinavsalonu-staging

# Service + Ingress
kubectl get svc,ing -n sinavsalonu-staging

# DNS'in çözüldüğünden emin ol (cluster ingress IP'sini bul)
kubectl get ing sinavsalonu -n sinavsalonu-staging \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

---

## 5. Smoke Test

```bash
./infra/helm/sinavsalonu/smoke-test.sh \
  https://api.staging.sinavsalonu.com \
  https://staging.sinavsalonu.com
```

**Beklenen çıktı:** Pass=8, Fail=0.

Başarısız ise:
- `/health` 503 → backend pod hâlâ start ediyor olabilir, 2 dk bekle tekrar dene
- `/marketplace/packages` 500 → DB bağlantısı yok, secret yanlış veya Prisma migrate eksik
- `/metrics` 200 dönüyor → network ACL kapalı değil, `internal-only` decorator çalışmıyor
- Frontend 502 → ingress backend service'i bulamıyor

---

## 6. Sonraki deploy

Sadece image güncelleme:

```bash
# Yeni image push'tan sonra
helm upgrade sinavsalonu ./infra/helm/sinavsalonu \
  --namespace sinavsalonu-staging \
  -f infra/helm/sinavsalonu/values-staging.yaml \
  --reuse-values \
  --set backend.image.tag=staging-$(git rev-parse --short HEAD)
```

---

## 7. Rollback

```bash
# Son N revizyonu listele
helm history sinavsalonu -n sinavsalonu-staging

# Rollback (örn. 3 numaralı revizyona)
helm rollback sinavsalonu 3 -n sinavsalonu-staging
```

---

## 8. Temizle (debug için)

```bash
helm uninstall sinavsalonu -n sinavsalonu-staging
kubectl delete namespace sinavsalonu-staging
```

---

## CI Entegrasyonu (gelecek)

`.github/workflows/staging-deploy.yml` (henüz yok — eklenebilir):

- `main` push → image build + push to GHCR
- KUBECONFIG secret ile cluster'a auth
- `helm upgrade --install` çalıştır
- Smoke test sonu pipeline başarısızsa rollback

> Şu an manuel deploy önerilir. Otomatik staging deploy aktive edilmeden önce
> SealedSecret / External Secrets Operator entegrasyonu yapılmalı (secret'lar
> Git'te tutulmaz).
