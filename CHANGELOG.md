# Değişiklik Günlüğü

Bu projede yapılan tüm önemli değişiklikler bu dosyada belgelenir.

Format [Keep a Changelog](https://keepachangelog.com/tr/1.0.0/) ve [Semantic Versioning](https://semver.org/lang/tr/) standartlarına uygundur. Tagged sürümlerden sonraki girişler `npm run release` ile [semantic-release](https://semantic-release.gitbook.io/) tarafından otomatik üretilir; aşağıdaki ilk sürümler manuel seed'tir.

## [Yayımlanmamış]

### ✨ Özellikler

- `feat(admin)`: AdminUserActivity — kullanıcı işlem geçmişi sayfası (`#278b3bb`)
- `feat(admin)`: AdminUserActivity — İşlem Tipi filtresi (gruplu Select) (`#ae237bc`)
- `feat(admin)`: AdminUserActivity — Varlık ID yerine anlaşılır label + link (`#cf4153d`)
- `feat(admin)`: Reklam paketleri yönetim sayfası (AdminAdPackages) (`#324ae65`)

### ♻️ Refactor

- `refactor(admin)`: AdminUserActivity — İşlem filtresi 2 kademeli cascade (`#0257b89`)
- `refactor(admin)`: Canlı Test + Reklam paketleri ManagePackages tek sayfada birleşti (`#99cacac`)
- `refactor(AdminSystemControls)`: Ödeme sağlayıcıları Mali Kontrol → Entegrasyonlar (`#680d2e5`)

### 🐛 Düzeltmeler

- `fix(admin)`: Audit log + user list cross-tenant bypass — admin tüm tenant'ları görür (`#2842986`)

### 🧪 Testler

- 35 yeni use-case unit test dosyası eklendi — 7 domain (billing/refund/auth/attempt/live/discount/moderation)
- Use-case coverage: %22 → %38 (branches +12, fns +11, lines +16)
- Frontend E2E: candidate-test-flow + a11y specleri genişletildi

### 🔧 Bakım

- `chore(admin)`: Sayfa adı "Kullanıcı İşlem Geçmişi" → "İşlem Geçmişi" (`#0712a47`)
- `chore`: Husky pre-commit hook eklendi (backend tsc + frontend ESLint)
- `chore`: CHANGELOG.md + semantic-release entegrasyonu (conventional commits)

## [1.6.0] - 2026-05-26

### ✨ Özellikler

- `feat(MySales)`: Satış Geçmişi tablosu için page-based pagination (`#053dbb1`)
- `feat(MyResults)`: Test geçmişi pagination — PaginationBar entegrasyonu
- `feat(TakeTest)`: Süre aşımı politikası — backend SubmitAnswerUseCase aşımda cevap kabul eder, overtimeSeconds takip edilir
- `feat(TakeTest)`: Serial Mode — cevap verildikten sonra sıradaki BOŞ soruya otomatik atlama
- `feat(TakeTest)`: "Testi Bitir" onay diyaloğu (cevaplanan/boş soru sayısı + Kaydet ve Çık alternatifi)
- `feat(attempt)`: hasSolutions=true testlerde aktif sınav sırasında çözüm gönder
- `feat(MyTests)`: Paketler 3-tier ile sıralanır — Devam edilecek > Başlanmamış > Bitenler
- `feat(Explore)`: tsvector search — exam type name desteği (LGS/KPSS/MSÜ shortcode'ları)

### 🐛 Düzeltmeler

- `fix(email-preferences)`: `@Inject()` decorator eksik — 500 hatası
- `fix(MyTests)`: N+1 fetch yerine purchase.package'tan türet — kalıcı çözüm
- `fix(TakeTest)`: Cevap state restoration PAUSED + IN_PROGRESS her ikisinde de
- `fix(TakeTest)`: Cevap kuyruğu race condition — ilk dönüşte cevap kayboluyordu

### ♻️ Refactor

- `refactor(Explore)`: Eğitici filtresi text search (dropdown ölçeklenmez)
- `refactor(MyTests)`: Eğitici filtresi dedupe + sort temizliği
- `refactor(dialog)`: `container` prop desteği — fullscreen TakeTest dialog'ları için

### 🧪 Testler

- `test(e2e)`: Aday test çözme akışları için 10 kapsamlı senaryo (yarım test + race fix + grid restore)

## [1.5.0] - 2026-05-19

### ✨ Önemli Eklemeler

- Multi-tenant izolasyon — Prisma extension ile tenant-scoped query
- Webhook replay koruması — `WebhookEvent` modeli ile idempotent webhook
- AI içerik moderasyonu — `use-cases/moderation/` (17 use-case)
- 2FA (iki faktörlü doğrulama) — TOTP + cihaz parmak izi
- i18n (çoklu dil) — tr/en/es/zh/de
- Frontend ürün analitiği — PostHog (KVKK/GDPR consent-gated)
- Helm/Kubernetes deploy chart'ı (backend/frontend/worker + ingress)

## [1.0.0] - 2026-05-17

İlk yayımlanmış sürüm. Sınav Salonu test marketplace platformu temel özellikleri.
