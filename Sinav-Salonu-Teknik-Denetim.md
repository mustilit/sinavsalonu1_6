# Sınav Salonu — Teknik Denetim Dokümanı (Revize)

**İlk hazırlanma:** 22 Mayıs 2026 · **Revizyon:** 24 Mayıs 2026
**Kapsam:** Fonksiyonalite (rol-fonksiyon matrisi), fonksiyonel olmayan özellikler (mimari, altyapı, teknoloji, sistem kontrolleri), veritabanı loglama/audit izleri.
**Yöntem:** Kod tabanının doğrudan taranması ve önceki bulguların güncel durumlarının tek tek doğrulanması.
**Bu revizyonun amacı:** İlk denetimde tespit edilen eksiklere yönelik yapılan düzeltmelerin doğrulanması; giderilen ve hâlâ açık olan maddelerin işaretlenmesi.

---

## Revizyon Özeti — Önceki Bulguların Güncel Durumu

İlk denetimdeki 16 bulgunun büyük çoğunluğu giderilmiş. Özet:

| # | Bulgu | Önceki | Güncel durum |
|---|---|---|---|
| 1 | WORKER yetkilendirmesi backend'de uygulanmıyor | Kritik | ✅ **Giderildi** — `WorkerPermissionsGuard` yazıldı ve global zincire eklendi |
| 2 | Yedekleme özelliği yok (BackupLog/scheduler/pg_dump) | Kritik | ✅ **Giderildi** — model + servis + scheduler + use-case + migration eklendi |
| 3 | Rol kontrolü olmayan hassas endpoint'ler (upload, billing) | Kritik | ✅ **Giderildi** — billing `EDUCATOR/ADMIN`; upload açık `@Roles` (4 rol, bilinçli) |
| 4 | Çakışan controller kayıtları (attempts, marketplace) | Orta | ✅ **Giderildi** — yinelenen controller'lar kaldırıldı |
| 5 | Multi-tenant izolasyonu enforce edilmiyor | Orta | ✅ **Büyük ölçüde giderildi** — Prisma `tenantExtension` otomatik filtre enjekte ediyor (kalıntı: tek-kayıt lookup) |
| 6 | CLAUDE.md ↔ kod tutarsızlıkları (nginx, scripts, husky) | Orta | ⚠️ **Kısmen açık** — nginx/scripts/.husky hâlâ yok |
| 7 | `/metrics` ve `/health/*` kimliksiz açık | Orta | ✅ **Giderildi** — `InternalOnlyGuard` + `METRICS_ALLOWED_IPS` IP allowlist |
| 8 | DLQ email kaynağı tutarsız | Orta | ✅ **Giderildi** — `EmailLog` canonical + `AuditLog` legacy birlikte okunuyor |
| 9 | Test coverage eşikleri düşük | Orta | ❌ **Açık** — hâlâ %30/%25 |
| 10 | Metrics in-memory / process-local | Orta | ✅ **Giderildi** — `prom-client` (default + histogram + counter) |
| 11 | ADMIN rol hiyerarşisi yok | Düşük | ❌ **Değişmedi** — muhtemelen bilinçli (aşağıda) |
| 12 | İş akışı durum izleri eksik (timestamp) | Düşük | ✅ **Giderildi** — Purchase/AdPurchase/Subscription/ExamQuestion/Option zaman damgaları eklendi |
| 13 | CORS allowedHeaders dar | Düşük | ✅ **Giderildi** — `Idempotency-Key`, `X-Tenant-Id` eklendi |
| 14 | CSP `style-src 'unsafe-inline'` varsayılanı | Düşük | ⚠️ Bu revizyonda yeniden doğrulanmadı |
| 15 | `InMemory*` repository'ler prod ağacında | Düşük | ⚠️ Bu revizyonda yeniden doğrulanmadı |
| 16 | `requestCount` sayacı bağlı değil | Düşük | ✅ **Giderildi** — prom-client histogram ile kapsanıyor |

**Kalan açık maddeler:** #6 (nginx/scripts/husky), #9 (coverage eşikleri), #11 (ADMIN hiyerarşisi — muhtemelen bilinçli karar), #5'in tek-kayıt lookup kalıntısı, ve doğrulanmayan #14/#15.

---

## 1. Fonksiyonalite — Rol-Fonksiyon Matrisi

Roller: **CANDIDATE** (aday), **EDUCATOR** (eğitici), **ADMIN**, **WORKER**. *(AUTHOR/STUDENT kullanılmaz.)*

### 1.1 Yetkilendirme Mekanizması (güncellendi)

Global guard zinciri `apps/backend/src/nest/main.ts` içinde artık **üç** guard'dan oluşuyor:

```
app.useGlobalGuards(
  new JwtAuthGuard(jwtService, reflector, redisCache),
  new RolesGuard(reflector),
  new WorkerPermissionsGuard(reflector, redisCache),   // YENİ
);
```

- **JwtAuthGuard:** `@Public` bypass; Bearer token zorunlu; ban/suspend kontrolü (Redis 60s).
- **RolesGuard:** `@Roles` yoksa geçer; varsa `requiredRoles.includes(user.role)`. Tek seviye — ADMIN otomatik üst-rol değil (bkz. Bölüm 4, madde 11).
- **WorkerPermissionsGuard (YENİ):** `@WorkerPermissions('PageName')` metadata'sını okur. `@WorkerPermissions` yoksa geçer; ADMIN her sayfaya geçer; WORKER için `WorkerPermission.pages` listesini (Redis 60s cache) kontrol eder, yetki yoksa `WORKER_PAGE_FORBIDDEN`. WORKER olmayan rol decorator'lı endpoint'e erişemez. `invalidateWorkerPagesCache` ile izin değişiminde cache temizlenir.

**TierGuard:** Hâlâ yalnızca `@RequireTier` ile çalışır, global değil ve kullanılmıyor (pasif).

### 1.2 CANDIDATE (Aday)

| Method + Route | İşlev |
|---|---|
| `POST /tests/:id/start` | Deneme başlat |
| `POST /attempts/:id/{pause,resume,answer,answers,finish,timeout}`, `PATCH .../checkpoint` | Deneme akışı |
| `GET /attempts/:id/{state,result}`, `.../questions/:qid/solution` | Durum / sonuç / çözüm |
| `POST /purchases/:testId` | Test satın al (throttle 30/dk) |
| `POST /tests/:id/reviews`, `/marketplace/packages/:id/reviews` | Değerlendirme |
| `POST /objections`, `GET /me/objections` | İtiraz aç / listele |
| `POST /refunds` (3/5dk), `/refunds/:id/appeal`, `GET /me/refunds` | İade akışı |
| `POST/DELETE/GET /follows` | Eğitici takip |
| `GET /home/recommended-tests`, `/me/topic-performance` (+ADMIN) | Öneriler / performans |
| `PATCH /notifications` | Bildirim tercihleri |

### 1.3 EDUCATOR (Eğitici)

| Method + Route | İşlev |
|---|---|
| `POST /tests`, `PUT /tests/:id/{publish,unpublish}`, `PATCH /tests/:id` | Test yaşam döngüsü (EDUCATOR, ADMIN) |
| `POST/PATCH/DELETE .../questions`, `.../options` | Soru & seçenek CRUD |
| `GET/POST/PATCH/DELETE /packages...` | Paket CRUD + yayımlama |
| `PATCH /educators/me` | Profil |
| `POST/GET /educators/me/discount-codes`, `PATCH .../toggle` | İndirim kodu |
| `GET /educators/me/reports/sales`, `/me/sales`, `/me/tests`, `/me/packages/views` | Raporlar/metrikler |
| `POST/GET /educators/me/ads`, `GET /me/ads/stats` | Reklam |
| `GET/POST /educators/me/objections...` | İtiraz yanıtlama |
| `GET /educator/refunds` (+ADMIN), `POST /educator/refunds/:id/{approve,reject}` | İade kararı |
| `POST /live-sessions`, `GET /my`, `POST /:id/{pay,start,next,prev,toggle-stats,end,round2}` | Canlı oturum (EDUCATOR, ADMIN) |
| `/v1/billing/{checkout,portal,subscription}` | **Abonelik (YENİ: `EDUCATOR, ADMIN`)** |
| `GET /me/moderation-status` (+ADMIN) | Moderasyon durumu |

### 1.4 ADMIN

Kullanıcı/eğitici yönetimi, içerik (exam-types, topics), moderasyon (queue/results + violations/actions + blocked-terms), finans (settings, site-settings, komisyon, ad-packages, discount-codes), iade/itiraz, raporlama (stats, candidate/educator report + bulk-email, audit, **dlq/emails+errors**), sözleşme, email trafiği (`/admin/email/*`), canlı tier ve **yedekleme ayarları/manuel tetikleme (YENİ)**.

### 1.5 WORKER (artık enforce ediliyor)

`@Roles('ADMIN','WORKER')` + `@WorkerPermissions('ModerationQueue')` ile moderasyon kuyruğu endpoint'leri. **Önemli fark:** Artık `WorkerPermissionsGuard` sayesinde, `WorkerPermission.pages` içinde ilgili sayfa olmayan bir WORKER bu endpoint'lere erişemez. Yetki kontrolü backend'de gerçek.

### 1.6 Upload — bilinçli kapsamlandırma

`POST /upload/image` artık açık `@Roles('CANDIDATE','EDUCATOR','ADMIN','WORKER')` taşıyor. Yani "rol kontrolü yok" durumu giderildi; ancak fiilen dört role de açık (5MB, yalnız `image/*`). Eğer CANDIDATE/WORKER'ın görsel yüklemesi istenmiyorsa rol listesi daraltılabilir — şu an bilinçli bir karar olarak görünüyor.

---

## 2. Fonksiyonel Olmayan Özellikler

### 2.1 Mimari

Clean Architecture dört katman (`application/use-cases`, `domain/interfaces`, `infrastructure/repositories`, `nest/controllers`). DI `app.module.ts` `useFactory`. API versiyonlama `VersioningType.URI` (`/v1/...`).

**Multi-tenant (güncellendi):** `Tenant` modeli + `tenantId`. Artık `middleware/tenant.middleware.ts` tenant'ı `runWithTenant` (AsyncLocalStorage) ile request-scope'a koyar; `infrastructure/database/tenantExtension.ts` Prisma `$extends` ile **tenant-aware modellerin** (`User, ExamTest, TestPackage, Purchase, AuditLog, EmailLog, Subscription, BackupLog` vb. 19 model) `findMany/findFirst/count/aggregate/groupBy/updateMany/deleteMany` sorgularına otomatik `AND { tenantId }` filtresi enjekte eder. Cron/script için `bypass` escape-hatch'i var. **Kalıntı:** Tek-kayıt `findUnique/update/delete` filtrelenmez (kod yorumunda belirtilmiş; developer ayrıca tenantId doğrulamalı).

### 2.2 Güvenlik / Sistem Kontrolleri (güncellendi)

| Alan | Durum |
|---|---|
| JWT auth | Global guard; `@Public` bypass; ban/suspend (Redis 60s) |
| **WorkerPermissions** | ✅ **Artık enforce ediliyor** (`WorkerPermissionsGuard`) |
| 2FA | TOTP + recovery, AES-GCM şifreli secret, kill-switch |
| CSP | `nest/security/csp.ts` + helmet (`reportOnly` env, `frameAncestors 'none'`, HSTS prod) |
| Kill-switch'ler | AdminSettings: purchases/packageCreation/testPublishing/testAttempts/adPurchases/twoFactor + moderasyon + email matrisi + **backupEnabled** |
| Input validation | Global `ValidationPipe({ whitelist, transform })` + class-validator |
| Webhook | Stripe/Iyzico imza doğrulama + `WebhookEvent` replay koruması |
| Idempotency | `Idempotency-Key` interceptor (Redis NX, 24h, 409 on hash mismatch) |
| Rate limiting | `@nestjs/throttler` + Redis; tenant>user>IP; throttle → `SUSPICIOUS_RATE_LIMIT` audit |
| **İç endpoint koruması** | ✅ **YENİ** `InternalOnlyGuard` + `METRICS_ALLOWED_IPS` (metrics + health) |
| CAPTCHA | Turnstile/hCaptcha/none, env, prod fail-safe |
| PII filtresi | Sentry header temizliği; frontend `sendDefaultPii: false` |
| KVKK retention | EmailLog body anonimleştirme (90 gün); PackageView `ipHash` |
| Şifreleme | EmailProviderConfig AES-256-GCM; bcrypt password |
| **Yedekleme** | ✅ **YENİ** `BackupService` + `BackupSchedulerService` + manuel tetikleme + `BackupLog` audit |
| npm audit / Dependabot | Haftalık gruplu + CI `security_audit` |
| **CORS** | ✅ allowedHeaders artık `Idempotency-Key`, `X-Tenant-Id` içeriyor |

### 2.3 Performans / Ölçeklenebilirlik

Cursor pagination (12+ use-case), composite index disiplini, tsvector + GIN full-text search (`test_packages.search_vector`), select discipline, Redis cache (fail-open), PgBouncer override, Prisma retry (P1001/P1008), read-replica foundation (`/health/replica`), frontend code splitting (71 lazy import), bundle analyzer, BullMQ worker'lar (email / email-traffic / dlq).

### 2.4 Gözlemlenebilirlik (güncellendi)

- **Sentry:** Backend `instrument.ts` (5xx → captureException, PII filtresi), frontend + ErrorBoundary.
- **Metrics:** ✅ Artık `prom-client` — default metrikler (cpu, eventloop, gc, heap) + HTTP request histogram + exception counter. `/metrics` `@Public` + `@InternalOnly` (IP allowlist). Process-local sınırlama büyük ölçüde giderildi; çok-replica'da yine de scrape başına instance bazlı.
- **Health:** `/health`, `/health/{db,redis,replica}`, `/ready` — artık `@InternalOnly` korumalı.
- **Logging:** JSON structured (requestId/tenantId), `request-id.middleware.ts`.

### 2.5 Altyapı / DevOps

- **Docker Compose** (`infra/docker/`): `docker-compose.yml` (dev), `.prod.yml`, `.ci.yml`, `.pgbouncer.yml`. *(`local-staging.yml` hâlâ yok — CLAUDE.md güncellenmeli.)*
- **Helm / K8s:** `infra/helm/sinavsalonu/` mevcut.
- **Nginx:** ❌ Hâlâ yok (`infra/nginx/` dizini mevcut değil). Frontend prod hâlâ `serve -s dist`; statik dosyalarda CSP/gzip/cache reverse-proxy katmanı yok.
- **CI/CD:** `backend-migrate-and-test.yml` (build_test, frontend_test, frontend_a11y [bloklayıcı], frontend_build, security_audit, smoke, e2e_smoke_db, migrate guard/deploy, Slack notify) + `mutation-test.yml` (Stryker, haftalık).
- **Pre-commit / scripts:** ❌ `.husky/` ve `scripts/staging.sh` hâlâ yok.

### 2.6 Frontend NFR

Dark mode (`next-themes`), a11y (Playwright + axe, CI bloklayıcı, WCAG 2.1 AA), test altyapısı (Vitest — **coverage eşikleri hâlâ %30/%25**, Jest, Stryker), TanStack Query, React Router v6, i18n (i18next), merkezi `dalClient.js`.

---

## 3. Veritabanı Loglama / Audit İzleri

### 3.1 Audit / İş Logları

**Merkezi `AuditLog` (`audit_logs`)** — 76 olay tipli `AuditAction` enum; alanlar: `action`, `entityType/entityId`, `actorId`, `tenantId`, `actorEmail/actorRole`, `before/after` (Json diff), `ip/userAgent`, `metadata`, `createdAt`. Güçlü composite index seti. `BACKUP_RUN` artık gerçekten kullanılıyor.

**Email logları:** `EmailLog` (queuedAt/sentAt/deliveredAt/bouncedAt/attemptCount/lastError/status), `EmailEvent` (yaşam döngüsü), `SuppressedEmail` (reason/createdBy/expiresAt), `EmailProviderConfig` (durum izi), `EmailTemplate` (versiyon).

**Webhook/ödeme:** `WebhookEvent` (replay koruması), `IdempotencyKey`.

**Moderasyon:** `ModerationResult/Violation/Action` (tam aktör/aksiyon/zaman izi), `EducatorRiskScore`, `BlockedTerm`.

**Yedekleme (YENİ): `BackupLog`** — yedekleme sonuçlarının audit kaydı (model `schema.prisma:1647`); `AdminSettings.backupEnabled` + zamanlayıcı ayarları; migration `20260524100000_backup_log_and_settings`.

**İş akışı durum kayıtları (güncellendi):**

| Model | Durum izi |
|---|---|
| `RefundRequest` | status (7) + educatorDeadline/educatorDecidedAt/appealedAt/decidedBy/decidedAt — iyi izli |
| `Objection` | status + answeredAt/escalatedAt/adminAnsweredAt — iyi izli |
| `Purchase` | status + **`refundedAt` + `expiredAt` (YENİ)** + createdAt + deletedAt |
| `AdPurchase` | createdAt + validUntil + **`canceledAt` (YENİ)** |
| `Subscription` | startedAt + canceledAt + currentPeriod\* + **`createdAt` + `updatedAt` (YENİ)** |

### 3.2 Sistem / Hata Logları

| Mekanizma | Nereye |
|---|---|
| Sentry | Harici (5xx), PII filtreli |
| HttpExceptionFilter | 5xx → Sentry; 429 → `AuditLog` (`SUSPICIOUS_RATE_LIMIT`) |
| CSP raporu | `AuditLog` (`CSP_VIOLATION`) |
| Email webhook | `EmailEvent` + `SuppressedEmail` |
| Metrics | prom-client registry (bellek-içi) |
| Health | console.error |

**DLQ (giderildi):** `AdminDlqController.listEmails` artık iki kaynağı birden okuyor — `EmailLog.status in (FAILED, DEAD_LETTER)` (canonical) **+** `AuditLog(EMAIL_FAILED)` (legacy). Önceki tek-kaynak tutarsızlığı kapandı.

### 3.3 createdAt / updatedAt ve Durum İzleri (güncellendi)

- **Soft-delete (`deletedAt`):** User, ExamTest, Purchase.
- **Güvenlik damgaları (`User`):** lastLoginAt, educatorApprovedAt, passwordResetToken(+ExpiresAt), twoFactorEnabled(+At), suspendedUntil, isBanned; `UserDevice` (firstSeenAt/lastSeenAt/trustToken).
- **Önceki "ikisi de yok" maddeleri giderildi:** `ExamQuestion` ve `ExamOption` artık `createdAt`+`updatedAt` taşıyor; `Subscription` artık `createdAt`+`updatedAt` taşıyor. Kalan istisnalar: `TopicExamType` (junction), `LiveOption`.

---

## 4. Kalan Açık / Gözden Geçirilecek Noktalar

### Açık (giderilmemiş)

1. **CLAUDE.md ↔ kod tutarsızlığı (#6).** `infra/nginx/default.conf`, `scripts/staging.sh`, `.husky/pre-commit`, `docker-compose.local-staging.yml` hâlâ yok. *Öneri:* Ya bu bileşenleri ekleyin (özellikle prod'da frontend statik dosyaları için reverse-proxy + CSP/gzip/cache katmanı ve pre-commit hook), ya da CLAUDE.md'yi gerçeğe göre güncelleyin. Frontend hâlâ `serve -s dist` ile sunuluyor.
2. **Test coverage eşikleri düşük (#9).** Frontend hâlâ statements/lines/functions %30, branches %25; kritik `dalClient.js` için ayrı eşik yok. *Öneri:* Kademeli artış planını işletin.

### Bilinçli olabilecek / değerlendirilecek

3. **ADMIN rol hiyerarşisi yok (#11).** `RolesGuard` hâlâ düz `includes`; yalnız `@Roles('EDUCATOR')` taşıyan endpoint'lere ADMIN erişemez (örn. `POST /educator/refunds/:id/approve`). Tasarım kararıysa sorun değil; "admin her şeyi yapar" beklentisi varsa açıkça `ADMIN` eklenmeli.
4. **Tenant izolasyonunun tek-kayıt kalıntısı (#5).** `findUnique/update/delete` tenant filtresine girmiyor (tasarım gereği). Bu çağrılarda tenant doğrulamasının manuel yapıldığı kritik akışlarda gözden geçirilmeli.

### Bu revizyonda yeniden doğrulanmadı

5. CSP `style-src 'unsafe-inline'` varsayılanı (#14) ve prod kod ağacındaki `InMemory*` repository'ler (#15) bu turda ayrıca incelenmedi; düşük öncelikli olarak izlemede kalabilir.

---

*Not: Bu doküman, denetim sırasında doğrulanan kod durumunu yansıtır. Yetki/hiyerarşi gibi bazı maddeler bilinçli tasarım kararı olabilir; doküman bunları "kesin hata" değil, teslim öncesi gözden geçirilecek noktalar olarak işaretler.*
