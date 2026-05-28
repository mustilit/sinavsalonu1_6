# SLO / SLA — Sınav Salonu

> **Statü:** Production sertifikasyonu (Sprint 10)
> **Standart:** Google SRE Workbook — Service Level Objectives bölümü uyumlu

## Genel

**Service Level Indicators (SLI)** — ölçülen metrik
**Service Level Objectives (SLO)** — iç hedef (örn. p95 latency < 500ms)
**Service Level Agreement (SLA)** — müşteriyle sözleşmesel (gelecek, SOC 2 sonrası)

Bu doküman SLI/SLO'ları tanımlar; SLA tanımı paid customer onboarding sırasında
müşteri özelinde negotiate edilir.

## SLO Hedefleri

### 1. Availability (Uptime)

| Metric | Hedef | Hata bütçesi (28 gün) |
|---|---|---|
| HTTP success rate (5xx hariç) | **%99.9** | 40 dakika |
| Webhook ack rate (Stripe + Iyzico) | **%99.95** | 20 dakika |
| `/api/auth/login` success | **%99.5** | 3.3 saat (yüksek bot trafiği toleransı) |

Ölçüm: Prometheus `http_requests_total` + status code segmentation.

### 2. Latency

| Endpoint sınıfı | p95 SLO | p99 SLO |
|---|---|---|
| Tüm `GET /api/**` | **500ms** | **1500ms** |
| `POST /api/attempts/*` (cevap gönder/submit) | **300ms** | **1000ms** |
| `POST /webhooks/**` | **800ms** | **2000ms** |
| Marketplace listing (tsvector full-text) | **400ms** | **1200ms** |

Ölçüm: `http_request_duration_seconds_bucket` (histogram) + Grafana p95/p99.

### 3. Para akışı (özel)

| Metric | Hedef | Bütçe |
|---|---|---|
| Purchase webhook fail rate | **< %0.5** | 4 fail / 800 webhook (28 gün) |
| Idempotency replay correctness | **%100** | 0 hata |
| Refund processing | **< 24 saat** | 1 saatlik p95 hedefi |

Idempotency replay'in `%100` hedefi: aynı `Idempotency-Key` ile gelen istek
ASLA çift faturalama yapmamalı.

### 4. Data freshness

| Metric | Hedef |
|---|---|
| Replica lag | **< 5 saniye** (p95) |
| Email kuyruk depth (CRITICAL) | **< 100 mesaj** |
| Audit log gecikmesi | **< 1 saat** |

### 5. Stability

| Metric | Hedef |
|---|---|
| Pod restart frequency | **< 1/saat** (24 saat ortalama) |
| Circuit breaker OPEN durumu | **< 5 dakika/saat** (toplam) |
| Background job DLQ growth | **0** (warning < 10/gün) |

## Alert Rules (PrometheusRule)

Helm template: `infra/helm/sinavsalonu/templates/prometheusrule.yaml`

Alert'ler 5-10 dakikalık pencerelerde tetiklenir (false positive azaltma).
Critical → PagerDuty, Warning → Slack #monitoring.

| Alert | Eşik | Süre | Severity |
|---|---|---|---|
| `HighLatencyP95` | p95 > 500ms | 5dk | warning |
| `VeryHighLatencyP99` | p99 > 1.5s | 3dk | critical |
| `ElevatedErrorRate` | 5xx > %1 | 5dk | warning |
| `CriticalErrorRate` | 5xx > %5 | 2dk | critical |
| `PaymentWebhookFailures` | webhook 5xx > %0.5 | 5dk | critical |
| `ReplicaLagHigh` | lag > 5s | 5dk | warning |
| `CircuitBreakerOpen` | breaker = OPEN | 2dk | warning |
| `EmailQueueBacklog` | critical queue > 100 | 5dk | warning |
| `PodRestartingFrequently` | restart rate > 0 | 10dk | warning |

## Grafana Dashboard

JSON: `infra/helm/sinavsalonu/grafana-dashboards/sinavsalonu-overview.json`

Paneller:
1. **HTTP Request Rate** — status koduna göre (200/4xx/5xx ayrı seriler)
2. **p95 Latency** — route bazlı; 500ms eşik kırmızı çizgi
3. **5xx Error Rate** — single stat + threshold gradient
4. **Circuit Breaker State** — Stripe/Iyzico/Brevo OPEN durumda kırmızı
5. **Replica Lag** — saniye cinsinden, 5s eşik
6. **Email Queue Depth** — BullMQ critical/notify/bulk ayrı seriler
7. **Webhook Success Rate** — Stripe + Iyzico %99.95 hedef

Sidecar otomatik yükler (configmap label `grafana_dashboard=1`):

```bash
kubectl create configmap sinavsalonu-dashboards \
  --from-file=infra/helm/sinavsalonu/grafana-dashboards/ \
  -n monitoring \
  -l grafana_dashboard=1
```

## Hata bütçesi yönetimi

**Aylık hata bütçesi tükendiğinde:**
1. Otomatik: deployment freeze (release.yml workflow blocks)
2. Manuel review: kök sebep analizi + retroaktif iyileştirme
3. Bütçeye geri dönüş: bir sonraki ayın 1'inde reset

**Hata bütçesi politikası:**
- %0-50 tüketim → normal release tempo
- %50-80 → release kalitesi sıkı (mandatory rollout staging-first)
- %80-100 → feature freeze, sadece bug fix
- %100+ → 1 hafta cooldown + post-mortem

## DORA Metric Çapraz Referansı

| DORA | Bizim ölçüm | Workflow |
|---|---|---|
| Deployment Frequency | main commit rate (günlük) | `.github/workflows/dora-metrics.yml` |
| Lead Time for Changes | tag-arası medyan süre | aynı |
| MTTR | incident issue close-open delta | aynı |
| Change Failure Rate | incident / deployment % | aynı |

Aylık otomatik rapor: Her ayın 1'i 06:00 UTC GitHub issue olarak yayınlanır.

## İlgili

- ASVS L2 audit: `docs/compliance/asvs-l2-self-audit.md`
- DORA metrics: `scripts/measure-dora.js`
- Health endpoint: `apps/backend/src/nest/controllers/health.controller.ts`
- Prometheus rule template: `infra/helm/sinavsalonu/templates/prometheusrule.yaml`
- Grafana dashboard: `infra/helm/sinavsalonu/grafana-dashboards/`
- Circuit breaker: `apps/backend/src/infrastructure/resilience/circuitBreaker.ts`
- DB router: `apps/backend/src/infrastructure/database/dbRouter.ts`
