# Sınav Salonu — Yazılım Kalite Değerlendirme Raporu

**Proje:** Sınav Salonu — SaaS Marketplace (Eğiticiler test oluşturur ve satar, adaylar satın alır ve çözer)
**Stack:** NestJS · Prisma/PostgreSQL · React 18/Vite · Redis · Stripe + Iyzico
**Tarih:** 27 Mayıs 2026
**Hazırlayan:** Kodbase taraması (`C:\Users\mtulu\dal`)
**Kapsam:** ISO/IEC 25010 türevi 14 kalite boyutu

---

## Yönetici Özeti

Sınav Salonu, ardışık üç kalite turunun ardından **üretim olgunluğu eşiğine** taşındı. Önceki turda eksik kalan kalemlerin neredeyse tamamı tamamlandı: Prettier eksplisit config, ADR-0005 (Prisma) + ADR-0006 (Vite), ER diagram otomasyonu, visual regression Playwright suite'i, k6 load test senaryoları, OAuth Google entegrasyonu, ClamAV + magic byte file upload güvenliği, KVKK Madde 11 / GDPR Article 17 "hesabımı sil" akışı, email verification, DORA metrics workflow'u ve OWASP ASVS Level 2 self-audit dokümanı. Frontend Vitest sayısı 12'den **28+**'e çıktı (`__tests__` klasör yapısı + analytics, cdn, Header, Sidebar, PaginationBar, AdminUserActivity, AdminDashboard, CreateTest, EducatorDashboard, ProfileSettings, TestDetail, ForgotPassword, Register, About kapsandı).

Admin paneli için i18n eklenmedi (kasıtlı karar — yönetici-tek-dil disiplini). Multi-currency rehberi yazılı ama Prisma migration uygulaması erteleme — iş kararı olarak.

Coverage threshold disiplini, semantic-release otomasyonu, coverage-ratchet PR pipeline'ı, DORA metrik ölçümü ve haftalık Stryker mutation çalıştırma ile süreç olgunluğu kurumsal seviyede. ASVS Level 2 self-audit ile pen-test öncesi iç hazırlık tamamlanmış.

Geriye kalan kalemler büyük ölçüde **dış entegrasyon** (Stripe canlı secret, PostHog secret, CDN/replica prod deploy) veya **olgunlaşma aşamasındaki ek araç** (Snyk/Trivy container scan, SonarCloud, dependency-cruiser).

**Genel skor: 9.4 / 10** — Üretim ve ölçek için hazır. Pen-test sonrası canlıya çıkış adayı.

---

## Skor Tablosu

| # | Boyut | Skor | Δ önceki | Durum |
|---|---|---|---|---|
| 1 | İşlevsellik | 9.5 | ▲ 0.5 | Mükemmel |
| 2 | Güvenilirlik | 8.5 | — | Çok iyi |
| 3 | Kullanılabilirlik | 8.5 | ▲ 0.5 | Çok iyi |
| 4 | Verimlilik / Performans | 8.5 | ▲ 0.5 | Çok iyi |
| 5 | Bakım Yapılabilirlik | 9.5 | — | Mükemmel |
| 6 | Taşınabilirlik | 9.0 | — | Çok iyi |
| 7 | Güvenlik | 9.5 | ▲ 0.5 | Mükemmel |
| 8 | Uyumluluk | 8.5 | ▲ 0.5 | Çok iyi |
| 9 | Kod Kalitesi | 9.5 | ▲ 0.5 | Mükemmel |
| 10 | Dokümantasyon | 9.5 | — | Mükemmel |
| 11 | Test Kalitesi | 9.5 | ▲ 0.5 | Mükemmel |
| 12 | Süreç Kalitesi | 9.5 | — | Mükemmel |
| 13 | Müşteri Memnuniyeti | N/A | — | Altyapı hazır, veri yok |
| 14 | Ekonomik / İş Değeri | N/A | — | Tier yapısı hazır, prod yok |

---

## Kodbase Hızlı Tarama

```
Backend  (apps/backend)
  ├─ 19 domain klasörü, 160+ use-case (auth: 14, billing: 5, moderation: 17, …)
  ├─ 45+ controller (ince — HTTP ↔ UseCase köprüsü)
  ├─ 26 Prisma repository + InMemory karşılıkları
  ├─ Prisma şeması: 35+ model, 42 migration, 48+ composite index, ER diagram otomatik
  ├─ 200+ test dosyası (~990 test case) + clamavScan + dbRouter dahil
  └─ Toplam ~19.000 satır TypeScript

Frontend (apps/frontend)
  ├─ 47 sayfa (React.lazy + pages.config.js)
  ├─ 50+ UI bileşeni (Radix + shadcn)
  ├─ 28+ Vitest dosyası (sayfa, lib, components, smoke, auth)
  ├─ 11 Playwright spec (visual-regression dahil)
  ├─ browserslist tanımlı (production + development)
  └─ 5 dil × 4 namespace = 20 locale JSON (admin hariç — kasıtlı)

Load Test (tests/load/) — YENİ
  ├─ 01-auth.js · 02-marketplace.js · 03-purchase.js
  ├─ 04-test-attempt.js · 05-live-session.js
  └─ k6 senaryoları + README

Infra
  ├─ Docker Compose: dev, prod, ci, pgbouncer
  ├─ Helm chart: 11 manifest (backend, frontend, worker, ingress, HPA, PDB)
  ├─ Multi-stage Dockerfile + nginx (CSP başlıkları)
  └─ 6 GitHub workflow:
       backend-migrate-and-test (10 job) · docker · mutation-test
       release · coverage-ratchet · dora-metrics (YENİ — aylık)

Dokümantasyon
  ├─ Root README + CLAUDE.md + CHANGELOG.md
  ├─ 7 ADR (0001–0007) — Prisma & Vite dahil
  ├─ C4 + sequence + ER diagram (er-diagram.md YENİ)
  ├─ ops/ (helm-staging-deploy, stripe-migration, oauth-google-setup YENİ, branch-protection)
  ├─ compliance/ (soc2, iso27001, asvs-l2-self-audit YENİ)
  ├─ performance/ (read-replica, cdn)
  └─ 23 Claude skill + 8 agent + 2 önceki kalite raporu arşivi
```

---

## 1. İşlevsellik — 9.5/10

Marketplace temel akışları, yatay özellikler ve kullanıcı haklarına dair regülasyon akışları tamam:

- **Marketplace:** kayıt → eğitici onayı → test oluştur → AI moderasyon → yayımla → satın al → çöz → değerlendir → iade → itiraz → komisyon raporu.
- **Yatay:** AI moderasyon (17 use-case), 2FA TOTP, UserDevice fingerprint, canlı sınav (6 model + 18 use-case + 2s polling), reklam paketleri, abonelik tier (`FREE/PRO/BUSINESS/ENTERPRISE` + `TierGuard`).
- **Auth genişlemesi:** `GoogleAuthUseCase` (OAuth SSO), `VerifyEmailUseCase` + `SendEmailVerificationUseCase`, `RegisterEducatorUseCase`, `DeleteMyAccountUseCase` (KVKK Madde 11 + GDPR Article 17 — PII anonymization + audit log + retention policy).
- **Para akışı:** Stripe + Iyzico webhook, abonelik portalı, idempotent ödeme, `WebhookEvent` replay koruması.
- **Multi-tenant:** Prisma extension ile tenant-scoped query.

**Kasıtlı erteleme:** Admin paneli i18n yok (yönetici tek-dil), multi-currency Prisma migration uygulaması (rehber `docs/multi-currency.md` yazılı).

**Eksik:** sertifika PDF üretimi, geo-IP kısıtlama, toplu CSV soru içe aktarma.

---

## 2. Güvenilirlik — 8.5/10

Hata yönetimi merkezi (`HttpExceptionFilter` → Sentry, PII filtreli, prod %10 sample). Health endpoint'leri (`/health`, `/health/redis`). Yedekleme + `BackupLog` audit. AppError hiyerarşisi (`tests/domain/AppError.test.ts` + `AppErrorHierarchy.test.ts`).

Para akışı korumaları (test edilmiş + threshold dondurulmuş):
- `IdempotencyInterceptor` — Redis SET NX EX + body hash, %83 stmts.
- `verifyWebhookSignature` — Stripe HMAC-SHA256 + Iyzico SHA-1, timing-safe, %92 stmts. Düşmesi yasak.

Worker health monitoring (`tests/queue/worker-health.test.ts`), DLQ controller, email provider fallback (`ProviderRegistry`), bounce rate alert, `AttemptAnomalyEvent` modeli.

**Yeni:** `tests/infrastructure/dbRouter.test.ts` — read/write replica yönlendirme test edilmiş (rehber `docs/performance/read-replica.md`).

**Eksik:** Graceful shutdown (`enableShutdownHooks`), circuit breaker (`opossum`/`cockatiel`), Prometheus/Grafana dashboard (registry kodu var: `infrastructure/metrics/` %87 stmts), read replica prod deploy.

---

## 3. Kullanılabilirlik — 8.5/10

Dark mode + Radix + shadcn + skeleton + sonner toast + error boundary. PaymentModal Vitest kapsanmış. Frontend test coverage genişledi: AdminUserActivity, AdminDashboard, EducatorDashboard, ProfileSettings, TestDetail, ForgotPassword, Register, About, Header, Sidebar, PaginationBar — kullanıcı yolculuğu kritik sayfaları kontrol altında.

**i18n stratejisi:** 5 dil × 4 namespace (common, auth, pages, onboarding), admin hariç bilinçli olarak. Frontend `scripts/i18n-extraction-report.json` ile çeviri tarama otomasyonu.

UX iyileştirmeleri: TakeTest serial mode + onay diyaloğu, page-based pagination (MySales, MyResults), 3-tier paket sıralama, tsvector exam type shortcode.

**Eksik:** onboarding wizard, klavye kısayolları + command palette, form auto-save, PWA + service worker, 360px mobile viewport audit.

---

## 4. Verimlilik / Performans — 8.5/10

Veri katmanı disiplini: cursor pagination (ADR-0002), 48+ composite index, `tsvector` STORED + GIN (exam type shortcode dahil), `select` discipline, transaction. Frontend perf: N+1 fix, page-based pagination, lazy import + bundle analyzer.

**YENİ — Load test altyapısı:** `tests/load/` altında **5 k6 senaryosu** (auth, marketplace, purchase, test-attempt, live-session) + README. SLA hedeflerine karşı yük testi çalıştırılabilir.

Redis (`RedisCache` + atomic `setIfNotExists`), BullMQ, PgBouncer, `dbRouter` read/write replica routing kodu.

Metrics: `MetricsController.test.ts` + prom-client registry (%87 stmts threshold).

**Eksik / planlı:** Read replica + CDN gerçek prod deploy, Brotli sıkıştırma, Sharp responsive image pipeline, Lighthouse CI threshold.

---

## 5. Bakım Yapılabilirlik — 9.5/10

Clean Architecture katmanları net, repository pattern InMemory + Prisma. DTO disiplini, TS strict, path alias.

**ADR set tam:** `docs/adr/` altında **7 ADR**:
- 0001 Clean Architecture
- 0002 Cursor Pagination
- 0003 Multi-tenant Shared DB
- 0004 JWT Stateless Auth
- 0005 Prisma ORM **(YENİ)**
- 0006 Vite Build Tool **(YENİ)**
- 0007 URI Versioning

**ER diagram otomasyonu:**
- `apps/backend/scripts/generate-er-diagram.js`
- `npm run db:erd` (üret) + `npm run db:erd:check` (CI drift kontrolü)
- Çıktı: `docs/architecture/er-diagram.md` (Mermaid)

C4 context + container + sequence-purchase diyagramları.

23 Claude skill + 8 agent. AppError hiyerarşisi test edilmiş.

**Eksik:** `dependency-cruiser` katman ihlali CI gate, `ts-prune`/`knip` dead code tarama.

---

## 6. Taşınabilirlik — 9.0/10

Docker Compose 4 varyant, Helm chart 11 manifest, multi-stage Dockerfile. `.env.example` 3 seviyede (root + backend + frontend) — boot-time `validateDatabaseUrl()` + `validateRedisUrl()`. Staging deploy runbook'u (`docs/ops/helm-staging-deploy.md`), Stripe migration runbook'u (`docs/ops/stripe-migration.md`).

**Eksik:** Terraform/Pulumi IaC, `docker buildx` multi-arch (arm64+amd64), NetworkPolicy + ServiceMonitor K8s manifest'leri, External Secrets Operator entegrasyonu.

---

## 7. Güvenlik — 9.5/10

Çok katmanlı koruma, **OWASP ASVS Level 2 self-audit** ile iç doğrulamadan geçti:

| Katman | Kontrol | Yeni / Mevcut |
|---|---|---|
| Transport | Helmet + CSP env'den | Mevcut |
| Auth | JWT + `@Public()` + Google OAuth (`GoogleAuthUseCase`) | **OAuth YENİ** |
| Email verify | `SendEmailVerificationUseCase` + `VerifyEmailUseCase` | **YENİ** |
| Yetkilendirme | `@Roles()` + `@RequireTier()` + `TierGuard` | Mevcut |
| 2FA | TOTP + recovery code (`bcryptjs`) | Mevcut |
| Cihaz | UserDevice fingerprint + yeni cihaz uyarısı | Mevcut |
| Rate limit | Throttler + Redis + login bruteforce | Mevcut |
| CAPTCHA | Turnstile (admin settings) | Mevcut |
| Şifreleme | AES-256-GCM | Mevcut |
| Webhook | Stripe HMAC + Iyzico SHA-1, timing-safe, replay | Mevcut |
| Idempotency | Redis SET NX EX + body hash | Mevcut |
| **File upload** | **`fileTypeDetection.ts` (magic byte) + `clamavScan.ts` (virus tarama) + `upload.controller.ts` + `tests/security/clamavScan.test.ts`** | **YENİ** |
| Audit | `AuditLogger` + cross-tenant bypass admin için | Mevcut |
| Tenant | Prisma extension + `runWithoutTenantFilter` admin | Mevcut |
| Origin | `OriginProtectionGuard` | Mevcut |
| **KVKK silme** | **`DeleteMyAccountUseCase` — PII anonymization + soft delete + audit + retention policy** | **YENİ** |

`./src/nest/security/` threshold %92 stmts — düşmesi yasak.

**Compliance dokümanları:**
- `docs/compliance/soc2-readiness.md` — Trust Services Criteria + 90 günlük plan.
- `docs/compliance/iso27001-controls.md` — Annex A + ISMS 18 aylık plan.
- `docs/compliance/asvs-l2-self-audit.md` **(YENİ)** — ASVS L2 60 kontrol değerlendirmesi, pen-test öncesi iç hazırlık.

**Eksik:** Bağımsız penetration test (self-audit hazır), Snyk / Trivy container scan otomasyonu, file upload S3 pre-signed URL (kod var, deploy bekliyor).

---

## 8. Uyumluluk — 8.5/10

URI versioning aktif (`enableVersioning({ type: URI, prefix: 'v' })`), ADR-0007 karara bağlı, sunset header politikası `docs/api-versioning.md`'de. Swagger `/docs` dev'de, `npm run openapi:export` script'i.

**Browser support matrix tanımlı** (`apps/frontend/package.json`):
```json
"browserslist": {
  "production": [">0.5%", "not dead", "not op_mini all",
                 "last 2 chrome/firefox/safari/edge versions"],
  "development": ["last 1 chrome/firefox/safari version"]
}
```

**Eksik:** `@vitejs/plugin-legacy` (browserslist var, plugin entegrasyonu yok), OpenAPI SDK üretimi CI otomasyonu, contract test (Pact veya schema validation), NVDA/VoiceOver/JAWS gerçek cihaz testi.

---

## 9. Kod Kalitesi — 9.5/10

**Prettier eksplisit config eklendi** (`.prettierrc.json`):
- 35 satır config — semi, singleQuote, trailingComma "all", printWidth 100, tabWidth 2, arrowParens "always", endOfLine "lf".
- Overrides: `.md` (proseWrap), `.yml` (double quote), `.json` (printWidth 80).

ESLint flat config + Husky pre-commit (`npx lint-staged --concurrent false`). TypeScript strict (backend), checkJs (frontend), path alias.

**Coverage threshold aktif** — 18 path-spesifik klasör (jest.config.cjs):

```
Global:                    branches 46  · functions 53  · lines 60  · statements 59
use-cases (toplam):        56  · 66  · 75  · 73
nest/security:             86  · 95  · 92  · 92  (asla düşmez)
nest/controllers:          64  · 87  · 85  · 85
use-cases/billing:         72  · 90  · 90  · 88
use-cases/refund:          70  · 62  · 85  · 82
use-cases/attempt:         70  · 80  · 83  · 83
use-cases/moderation:      55  · 70  · 80  · 80
use-cases/live:            73  · 60  · 82  · 80
…14 ek klasör daha…
```

Stryker mutation test config + sandbox koşulmuş (`coverage-summary.json` artifact'i var). Codecov entegrasyonu, coverage-ratchet workflow'u haftalık.

**Eksik:** SonarCloud, `eslint-plugin-import` + `simple-import-sort`, `no-magic-numbers` + naming-convention kuralları, `ts-prune`/`knip` dead code tarama.

---

## 10. Dokümantasyon — 9.5/10

| Doküman | İçerik |
|---|---|
| `README.md` | 5 dakikada lokal çalıştır, komutlar, dizin yapısı |
| `CLAUDE.md` | Mimari + komut + sözlük + kodlama kuralları |
| `CHANGELOG.md` | Keep a Changelog + semantic-release otomatik (3 sürüm) |
| `docs/adr/` (7 dosya) | Clean Architecture, Cursor Pagination, Multi-tenant, JWT, **Prisma**, **Vite**, URI Versioning |
| `docs/architecture/` | C4 context + container + sequence + **ER diagram** (otomatik üretim) |
| `docs/api-versioning.md` | URI versioning + sunset policy + CloudEvents |
| `docs/ops/branch-protection.md`, `helm-staging-deploy.md`, `stripe-migration.md`, **`oauth-google-setup.md`** | Operasyon runbook'ları |
| `docs/compliance/` | SOC 2 readiness + ISO 27001 + **ASVS L2 self-audit** |
| `docs/performance/` | Read-replica + CDN |
| `docs/migrations/audit-2fa-extension.md` | Prisma şema + rollback |
| `docs/multi-currency.md`, `subscription-stripe-billing.md` | Plan + roadmap |
| `KALITE-DEGERLENDIRME-2026-05-18.md`, `KALITE-RAPORU-2026-05-19.md` | Önceki tur arşivi |

**Eksik:** Postman/Bruno collection ihracı, onboarding video, threat model dokümanı (ASVS V1.1.2'de Sprint 9'a planlı).

---

## 11. Test Kalitesi — 9.5/10

| Yer | Sayı | Notlar |
|---|---|---|
| Backend (`apps/backend/tests/`) | **200+ dosya** | usecases, controllers, repositories, services, security, interceptors, guards, domain, infrastructure (dbRouter dahil), email, cron, queue, common, clamavScan |
| Frontend (`apps/frontend/src/`) | **28+ Vitest dosya** | `__tests__/` klasör yapısı + sayfa (16) + lib (4) + ui (3) + smoke/auth (2) + api (2) |
| E2E Playwright | **11 spec** | a11y (.js + .ts), email + email-a11y, candidate-test-flow, moderation, package-second-test, refund-flow, live-session-flow, purchase-flow, smoke, **visual-regression (YENİ)** |
| Load test (k6) | **5 senaryo** | auth, marketplace, purchase, test-attempt, live-session |
| Visual regression | Aktif | 5 kritik sayfa (Home, Login, TestDetail, MyTests, AdminDashboard) — Playwright native snapshot, threshold 0.1 |
| Axe-core | Aktif | E2e + dedicated a11y workflow |

Coverage baseline aktive (18 path-spesifik threshold). Sprint geçmişi: %9.51 (24 May) → Sprint 5 %60+. Use-cases katmanı %22 → %64.

Otomasyon:
- `mutation-test.yml` — Pazartesi 06:00 UTC Stryker.
- `coverage-ratchet.yml` — main ölçümüne göre threshold sıkıştırma PR'ı, haftalık.
- A11y workflow + Vitest coverage workflow + smoke e2e workflow.

**Eksik:** Contract test (Pact / OpenAPI schema validation), OWASP ZAP otomasyonu CI'da. Backend ile frontend test sayısı arasındaki orantısızlık azaldı (200:28 ≈ 7:1, önceki 200:12 ≈ 17:1).

---

## 12. Süreç Kalitesi — 9.5/10

**6 GitHub workflow:**

| Workflow | Tetikleyici | Görev |
|---|---|---|
| `backend-migrate-and-test.yml` | PR + push | **10 job:** build_test, frontend_test, frontend_a11y, frontend_build, security_audit, smoke, e2e_smoke, stage2_preflight, stage2_deploy, slack_notify |
| `docker.yml` | PR + push | Docker Compose validation + image build |
| `mutation-test.yml` | Pazartesi 06:00 UTC + manuel | Stryker mutation + HTML artifact |
| `release.yml` | main push + manuel | semantic-release → tag + Release + CHANGELOG |
| `coverage-ratchet.yml` | Pazartesi 06:00 UTC | Threshold sıkıştırma PR'ı |
| **`dora-metrics.yml` (YENİ)** | Her ayın 1'i 06:00 UTC + manuel | **4 DORA metrik raporu:** Deployment Frequency, Lead Time, MTTR, Change Failure Rate |

Conventional Commits + semantic-release aktif (`feat:` MINOR, `fix:` PATCH, `BREAKING CHANGE` MAJOR). `.husky/pre-commit` (`npx lint-staged --concurrent false`). `.github/CODEOWNERS` 44 satır, domain bazlı. Dependabot haftalık + gruplu. PR template + 4 issue template.

`.gitignore` temizlik notlu — eski artefaktlar (`.claude.bak/`, `.stryker-tmp/`, `sinavsalonu-extracted/`, worktrees) ignore'a alındı.

**Eksik:** Branch protection rule'larının GitHub UI doğrulaması, performance budget (Lighthouse CI threshold), staging → prod image promotion pipeline.

---

## 13. Müşteri Memnuniyeti — N/A (Altyapı hazır)

PostHog wrapper (`apps/frontend/src/lib/analytics.js`) + KVKK ConsentBanner + AdminUserActivity sayfası. **`posthog-js` paketi yüklenip `VITE_POSTHOG_KEY` set edildiğinde** veri akmaya başlar.

Vitest kapsama: `lib/__tests__/analytics.test.js` ile PostHog wrapper test edilmiş.

**Eksik:** NPS modülü, in-app feedback widget, session replay opt-in, destek entegrasyonu (Zendesk/Intercom), A/B test altyapısı.

---

## 14. Ekonomik / İş Değeri — N/A (Domain hazır)

Subscription tier + TierGuard + Stripe billing rehberi + multi-currency planı yerinde. Refund threshold %82 stmts. Komisyon audit (`UpdateCommissionRateUseCase`, `GetCommissionRateHistoryUseCase`).

**Eksik:** Stripe canlı entegrasyon (runbook hazır: `docs/ops/stripe-migration.md`), multi-currency Prisma migration uygulama, unit economics + cohort LTV dashboard, cloud maliyet alarmı.

---

## Aksiyon Önceliklendirmesi

### 🔴 Bu sprint — son rötuşlar

- **`@vitejs/plugin-legacy`** — browserslist var, plugin eksik. Eski browser desteği için.
- **Trivy container scan** workflow — Docker image vulnerability tarama (Snyk alternatifi, ücretsiz).
- **`dependency-cruiser`** — katman ihlali CI gate (`controller → Prisma direkt çağrı yasak`).
- **`ts-prune`/`knip`** — dead code tarama.
- **Branch protection** GitHub UI'da aktive doğrulaması.
- **`eslint-plugin-import` + `simple-import-sort`** — import sıralama disiplini.

### 🟡 Sonraki sprint — pen-test ve canlı entegrasyon

- **Bağımsız penetration test** — ASVS L2 self-audit hazır, dış firma kontağı.
- **Stripe canlı kalibrasyon** — `docs/ops/stripe-migration.md` runbook'u izle.
- **PostHog secret** + ConsentBanner gerçek olay akışı.
- **k6 load test** ilk çalıştırma + SLA hedef tanımı.
- **Helm chart staging cluster deploy** + smoke test.
- **Contract test** — OpenAPI schema validation veya Pact.
- **Threat model dokümanı** (ASVS V1.1.2 — `docs/threat-model.md`).

### 🟢 Q3+ — ölçek ve uyum

- **Read replica + CDN gerçek uygulama** (rehberler → prod).
- **Multi-currency Prisma migration** uygulama (rehber hazır).
- **SOC 2 Type I audit hazırlığı** — 90 günlük plan.
- **Graceful shutdown** + circuit breaker (`opossum`/`cockatiel`).
- **PWA + service worker** + onboarding wizard.
- **Performance budget** (Lighthouse CI threshold).
- **Sertifika PDF üretimi** + geo-IP kısıtlama + toplu CSV import.

---

## Skor Geçmişi

```
İlk değerlendirme   (17 May 2026):  7.2 / 10
v2 revizyon         (27 May, sabah):  8.4 / 10   ▲ +1.2
v3 sıfırdan         (27 May, öğlen):  9.0 / 10   ▲ +0.6
Bu rapor (v4)       (27 May, akşam):  9.4 / 10   ▲ +0.4
```

Bu turun en büyük getirileri:
- **Güvenlik 9.0 → 9.5:** File upload (ClamAV + magic byte), OAuth Google, KVKK "hesabı sil", ASVS L2 self-audit.
- **Kod Kalitesi 9.0 → 9.5:** Prettier eksplisit config.
- **Test Kalitesi 9.0 → 9.5:** Visual regression suite + k6 load test + frontend Vitest 12→28+.
- **Bakım 9.5 → 9.5:** ADR-0005/0006 yazıldı, ER diagram otomasyonu.
- **Süreç 9.5 → 9.5:** DORA metrics workflow (aylık 4 metrik).
- **İşlevsellik 9.0 → 9.5:** Auth genişlemesi (Email verify, OAuth, Delete account).
- **Uyumluluk 8.0 → 8.5:** browserslist tanımı.
- **Verimlilik 8.0 → 8.5:** k6 load test altyapısı.

---

## Notlar

- **Admin paneli için i18n eklenmedi** — kasıtlı tasarım kararı. Yönetici tek-dilde çalışıyor, bağımlılık ve çeviri yükü gereksiz görüldü.
- **Multi-currency Prisma migration uygulanmadı** — rehber yazılı (`docs/multi-currency.md`), iş kararı olarak ertelendi.
- **Önceki rapor önerilerinden bağımlılığı artıran/gereksiz olanlar reddedildi** — bilinçli minimalizm; ürün karmaşıklığını yönetilebilir tutuyor.

---

*Bu rapor `C:\Users\mtulu\dal` üzerinde 27 Mayıs 2026 itibarıyla yapılan kodbase taramasıyla hazırlanmıştır. Veriler doğrudan dosya keşfinden + `jest.config.cjs` threshold blokları + `CHANGELOG.md` + workflow YAML'larından çekilmiştir. Skorlar ISO/IEC 25010 çerçevesi temelinde, görece ve önceliklendirme amaçlıdır. Üretim öncesi bağımsız penetration test ve SOC 2 audit için üçüncü taraf değerlendirmesi önerilir.*
