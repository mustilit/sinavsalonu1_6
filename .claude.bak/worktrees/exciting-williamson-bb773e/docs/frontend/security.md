# Frontend Güvenlik Önlemleri

**Son güncelleme:** 2025-03-02

---

## 1. Alınan Önlemler

### 1.1 CSP (Content Security Policy) Uyumu
- **Durum:** Backend CSP header'ı yönetir (`apps/backend/src/nest/security/csp.ts`)
- **Öneri:** Inline script/style kullanımından kaçının; `unsafe-eval` kullanılmamalı
- **Frontend:** Vite build inline'ı minimize eder; production'da hash'li scriptler kullanılır

### 1.2 XSS (Cross-Site Scripting)
- **`dangerouslySetInnerHTML`:** Yasak (özel durumlar hariç)
- **Kullanıcı içeriği:** Sanitize edilmeden render edilmez
- **react-markdown:** Kullanıcı girdisi markdown ise XSS riski için sanitize kütüphanesi (örn. DOMPurify) eklenmeli

### 1.3 Auth Güvenliği
- **Token saklama:** `sessionStorage` + `localStorage` (mevcut)
- **Öneri:** Mümkünse token'ı httpOnly cookie ile taşıyın (backend cookie-session desteği gerekir)
- **XSS riski:** Token storage'da olduğu sürece XSS ile sızabilir; CSP + strict sanitization şart
- **401 yönetimi:** Tek noktada (`apiClient.js`), redirect loop engeli (cooldown) ile

### 1.4 Open Redirect
- **returnUrl (Login `from`):** Whitelist ile doğrulanır
  - Sadece `/` ile başlayan path'ler
  - `//` ile başlayanlar reddedilir (protocol-relative URL)
  - `/Login`, `/Register` hariç

### 1.5 Dependency Hijacking
- **`npm audit`:** Düzenli çalıştırılmalı
- **Kritik açıklar:** Fix edilmeli
- **Komut:** `cd apps/frontend && npm audit`

### 1.6 Error Leakage
- **Prod:** Stack trace UI'da gösterilmez
- **`toSafeMessage`:** `src/lib/api/errors.js` – prod'da sadece error code / güvenli mesaj
- **Backend error contract:** `{ error: { code, message, details } }` parse edilir; details hassas bilgi içerebilir – UI'da sadece message kullanılır

---

## 2. Kalan Riskler

| Risk | Açıklama | Öneri |
|------|----------|-------|
| Token storage | sessionStorage/localStorage XSS'e açık | httpOnly cookie'ye geçiş |
| react-markdown | Kullanıcı markdown'ı XSS riski taşıyabilir | DOMPurify entegrasyonu |
| CORS | Prod'da backend whitelist gerekli | Backend CORS origin kontrolü |
| Rate limiting | Frontend tarafında yok | Backend throttling yeterli |

---

## 3. Rollback

Güvenlik değişiklikleri geri alınırken:
- `apiClient.js` → eski axios tabanlı dalClient'a dönülebilir
- Login `safeFrom` validasyonu kaldırılırsa open redirect riski artar
