# Sayfa Çağırma Hatası – Teşhis ve Sınıflandırma

**Son güncelleme:** 2025-03-02  
**Kapsam:** Vite + React Router SPA, Dal backend

---

## 1. Hata Sınıflandırması

"Sayfa çağırma hatası" genelde aşağıdaki 4 kategoriden birine girer:

| # | Hata türü | Belirtiler | Root cause |
|---|-----------|------------|------------|
| 1 | **Router / route bulunamadı** | 404, blank page, "Cannot GET /route", "No routes matched location" | Route tanımı eksik, path case uyumsuzluğu |
| 2 | **Auth / token kaynaklı yönlendirme döngüsü** | 401/403 sonrası sürekli Login'e atma, infinite redirect | Token geçersiz, interceptor redirect loop, AuthContext race |
| 3 | **API base URL / env yanlış** | "Sunucuya ulaşılamadı", ERR_NETWORK, mixed-content | VITE_API_URL eksik/yanlış, proxy kapalı, port uyumsuzluğu |
| 4 | **CORS / preflight** | OPTIONS 204/403, "CORS policy… blocked" | Backend whitelist eksik, proxy bypass |
| 5 | **Build-time vs runtime path (SPA refresh 404)** | Refresh ile route 404 | Server fallback eksik (try_files / index.html) |
| 6 | **Chunk load / dynamic import** | "Loading chunk failed" | Cache busting, deploy uyumsuzluğu |

---

## 2. Tekrarlama Adımları

### 2.1 Route 404 / Blank page
1. Tarayıcıda `http://localhost:5174/Explore` aç
2. Sayfayı yenile (F5)
3. **Beklenen:** Explore sayfası görünür
4. **Mevcut:** Blank veya 404 ise → SPA fallback veya route config sorunu

### 2.2 Auth redirect loop
1. Giriş yap (Login)
2. Korumalı sayfaya git (örn. MyTests)
3. Token'ı manuel sil (DevTools → Application → Session Storage)
4. Sayfayı yenile
5. **Beklenen:** Tek sefer Login'e yönlendirme
6. **Mevcut:** Sürekli Login'e atıyorsa → redirect loop

### 2.3 API / Backend ulaşılamıyor
1. Backend kapalıyken frontend aç
2. Login dene
3. **Beklenen:** "Sunucuya ulaşılamadı" benzeri mesaj
4. **Mevcut:** ERR_NETWORK, timeout → env/proxy kontrolü

---

## 3. Root Cause Hipotezleri

### 3.1 Proje özel bulgular

| Alan | Durum | Not |
|------|-------|-----|
| **Vite port** | 5174 (dev) | `vite.config.js` server.port: 5174 |
| **Proxy** | Var | `/auth`, `/marketplace`, `/tests` vb. → localhost:3000 |
| **Env** | VITE_API_URL | dalClient: VITE_API_URL varsa kullanır, yoksa port 5174'te '' (proxy) |
| **Port uyumsuzluğu** | Potansiyel | dalClient port 5173 kontrol ediyor; dev 5174 kullanıyor → 5174'te baseURL '' doğru |
| **SPA fallback** | Var | `serve -s dist` (frontend.Dockerfile) SPA modunda index.html döner |
| **Auth storage** | sessionStorage + localStorage | token, dal_auth; 401'de interceptor temizliyor |
| **401 redirect** | AuthContext + App.jsx | authError.type === 'auth_required' → window.location.replace('/Login') |
| **Redirect loop riski** | Düşük | AuthContext checkUserAuth tek sefer; 401 interceptor sadece storage temizliyor, redirect yapmıyor |

### 3.2 Olası sorunlar
- **GIRIS-SORUNU.md:** Backend kapalıyken "Sunucuya ulaşılamadı" → API base URL / backend erişimi
- **returnUrl:** Login `from` parametresi `rawFrom.startsWith('/')` ile sınırlı; `//evil.com` gibi protocol-relative URL riski
- **CORS:** Dev'de proxy kullanıldığı için CORS minimize; prod'da backend whitelist gerekli

---

## 4. Çözüm Planı

| # | Aksiyon | Öncelik |
|---|---------|---------|
| 1 | API client tek katmana taşı (http.ts, errors.ts) | Yüksek |
| 2 | Env doğrulama (zod) build-time | Yüksek |
| 3 | 401 interceptor: redirect loop engeli (aynı route tekrar push yapma) | Orta |
| 4 | returnUrl whitelist: `//` ile başlayanları reddet | Orta |
| 5 | SPA fallback: serve -s zaten var; README'ye not ekle | Düşük |
| 6 | ErrorBoundary + router errorElement | Orta |

---

## 5. Log ve Ölçüm Önerileri

- **Dev:** Console'da API hataları, auth state değişimleri (verbose)
- **Prod:** Sadece error code, stack trace UI'da gösterilmez
- **Network:** 401/403 sayısı, timeout sayısı (opsiyonel Sentry)
