# Frontend Performans

**Son güncelleme:** 2025-03-02

---

## 1. Mevcut Önlemler

### 1.1 Code Splitting
- **Durum:** Route bazlı lazy import henüz yok
- **Öneri:** `React.lazy` + `Suspense` ile sayfa bazlı lazy load
- **Örnek:**
  ```js
  const Explore = React.lazy(() => import('./pages/Explore'));
  <Suspense fallback={<Loading />}><Explore /></Suspense>
  ```

### 1.2 Caching
- **TanStack Query:** `@tanstack/react-query` kullanılıyor
- **staleTime:** `query-client.js` içinde yapılandırılabilir
- **GET istekleri:** react-query cache ile tekrarlayan istekler azaltılır

### 1.3 Render Performansı
- **Büyük listeler:** Virtualization (react-window) henüz yok
- **Öneri:** 100+ öğeli listelerde `react-window` veya `@tanstack/react-virtual` kullanın

### 1.4 Image Performansı
- **Responsive images:** `srcset`, `sizes` kullanımı
- **Lazy loading:** `loading="lazy"` native attribute
- **Öneri:** Görsel yoğun sayfalarda uygulanmalı

### 1.5 Bundle Analizi
- **vite-bundle-visualizer:** Dev dependency olarak eklenebilir
- **Komut:** `npm run build -- --mode analyze` (plugin gerekir)
- **Hedef:** Ana bundle < 200KB (gzip), route chunk'lar < 50KB

---

## 2. Ölçüm Hedefleri

| Metrik | Hedef | Not |
|--------|-------|-----|
| LCP | < 2.5s | Largest Contentful Paint |
| FID | < 100ms | First Input Delay |
| CLS | < 0.1 | Cumulative Layout Shift |
| Bundle (main) | < 200KB gzip | Vite build output |
| Cache stratejisi | staleTime 5m (GET) | react-query |

---

## 3. Cache Stratejisi

- **GET /site/exam-types:** Public, staleTime 5 dakika
- **GET /auth/me:** Kısa staleTime (30s) veya auth değişiminde invalidate
- **GET /marketplace/tests:** staleTime 2 dakika

---

## 4. Rollback

Performans değişiklikleri (lazy load, virtualization) geri alınırken:
- Lazy import kaldırılıp normal import'a dönülebilir
- react-window kaldırılırsa liste render'ı eski haline döner
