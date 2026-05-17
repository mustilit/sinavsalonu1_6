---
name: react-component
description: React 18 + Vite + JavaScript (JSX) component pattern'leri — component yapısı, React Router DOM v6 routing, TanStack Query data fetching, form, error/loading state, React.lazy code splitting, dark mode (next-themes). Yeni component, sayfa, form yazılırken referans alın. Stack: React + Vite, TypeScript YOK, Server Action YOK.
---

# React Component Pattern'leri (Vite + JS Stack)

Sınav Salonu stack'i: React 18, Vite, JavaScript (JSX), Tailwind, Radix UI primitives (`shadcn/ui` tarzı), React Router DOM v6, TanStack Query, dalClient.js.

**Önemli:** Bu proje **Next.js DEĞİL.** Server Component, Server Action, App Router yok. SPA — her şey client-side.

## Component Konvansiyonu

```jsx
// apps/frontend/src/components/exam/ExamCard.jsx
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export function ExamCard({ exam, onPurchase }) {
  return (
    <article className="rounded border p-4 space-y-2">
      <h3 className="font-semibold">{exam.title}</h3>
      <p className="text-sm text-muted-foreground">{exam.description}</p>
      <div className="flex items-center justify-between">
        <span className="font-bold">{exam.priceCents / 100} ₺</span>
        <Link to={`/test/${exam.id}`}>
          <Button variant="secondary">İncele</Button>
        </Link>
        <Button onClick={() => onPurchase(exam.id)}>Satın Al</Button>
      </div>
    </article>
  );
}
```

Kurallar:
- **Named export.** Varsayılan export yasak.
- **JSX uzantısı:** `.jsx` (component) veya `.js` (util/hook).
- **Props destructure:** fonksiyon imzasında.
- **Konum:** `apps/frontend/src/components/<domain>/<ComponentName>.jsx` — domain = exam, question, attempt, user, payment, layout, ui.
- **Tailwind utility-first.** Dinamik class ismi yasak (`bg-${color}-500` JIT'i kırar).

## Sayfa (Page)

Sayfa = route hedefi. `apps/frontend/src/pages/` altında, `pages.config.js` ile route'a bağlanır.

```jsx
// apps/frontend/src/pages/TestDetail.jsx
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/api/dalClient';

export function TestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: exam, isLoading, error } = useQuery({
    queryKey: ['tests', id],
    queryFn: () => api.get(`/tests/${id}`),
    enabled: Boolean(id),
  });

  if (isLoading) return <Spinner />;
  if (error?.status === 404) return <ErrorState title="Sınav bulunamadı" />;
  if (error) return <ErrorState title="Bir hata oluştu" message={error.message} />;

  return <TestDetailView test={exam} onBack={() => navigate(-1)} />;
}
```

Sayfa component'i:
- Route param'larını okur (`useParams`)
- Data'yı TanStack Query ile çeker
- Loading + error UI verir
- Asıl render'ı bir alt component'e delege eder (test edilebilirlik)

## Routing & Code Splitting (React.lazy + Suspense)

Sınav Salonu'nda routing iki yerde tanımlı:
- `apps/frontend/src/pages.config.js` — sayfa-route eşlemesi (auto-generated)
- `apps/frontend/src/lib/routeRoles.js` — rol bazlı erişim

### Eager Import Sorunu

`pages.config.js` 47 sayfayı **eagerly** import ediyor: admin, educator, candidate sayfalarının hepsi ilk yüklemede bundle'a giriyor. Login bile olmayan ziyaretçi `AdminEducatorReport`'u indiriyor.

### Çözüm — React.lazy ile Route Bazlı Split

`pages.config.js` jeneratörünü `React.lazy` üretecek şekilde değiştir. Sözleşme:

```js
// apps/frontend/src/pages.config.js (auto-generated)
import { lazy } from 'react';
import __Layout from './Layout.jsx';

export const PAGES = {
  About:                  lazy(() => import('./pages/About')),
  AdminAdReport:          lazy(() => import('./pages/AdminAdReport')),
  AdminCandidateReport:   lazy(() => import('./pages/AdminCandidateReport')),
  // ... 47 sayfa
  Home:                   lazy(() => import('./pages/Home')),
  Login:                  lazy(() => import('./pages/Login')),
};

export const pagesConfig = {
  mainPage: 'Home',
  Pages: PAGES,
  Layout: __Layout,
};
```

**Sayfa dosyalarında ek değişiklik:** Her `pages/<Name>.jsx` **default export** vermeli (React.lazy default export bekler) — bu kural sayfalar için **istisna**. Component'ler hâlâ named export.

```jsx
// apps/frontend/src/pages/TestDetail.jsx
// import { useQuery } ...

function TestDetail() { /* ... */ }

export default TestDetail;       // ← lazy için zorunlu
export { TestDetail };           // ← isteğe bağlı, mevcut named import'ları kırmamak için
```

### Suspense Wrapper

`App.jsx`'te `<Routes>` etrafına tek bir `<Suspense>` sar:

```jsx
import { Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

function PageFallback() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// App component içinde:
<Suspense fallback={<PageFallback />}>
  <Routes>{/* ... */}</Routes>
</Suspense>
```

### Vite Bundle Analyzer (kontrol)

```bash
cd apps/frontend
npm install --save-dev rollup-plugin-visualizer
# vite.config.js'e plugin ekle, npm run build sonra dist/stats.html'i aç
```

Beklenen sonuç: initial bundle 300-500 KB civarı, her sayfa kendi chunk'ında 20-80 KB.

### Prefetch (opsiyonel iyileştirme)

Link hover'da next route'u prefetch:

```jsx
<Link
  to="/Explore"
  onMouseEnter={() => import('./pages/Explore')}
>
  Keşfet
</Link>
```

Sözleşme: kritik 3-5 sayfa için prefetch yeter; hepsine eklersen eager'a geri dönmüş olursun.

## Data Fetching — TanStack Query

```jsx
import { useQuery } from '@tanstack/react-query';
import api from '@/api/dalClient';

// Liste
const { data: tests = [], isLoading } = useQuery({
  queryKey: ['tests', { status: 'PUBLISHED' }],
  queryFn: () => api.get('/tests?status=PUBLISHED'),
  staleTime: 60_000,
});

// Tekil
const { data: test } = useQuery({
  queryKey: ['tests', id],
  queryFn: () => api.get(`/tests/${id}`),
  enabled: Boolean(id),
});

// Sonsuz scroll (cursor pagination)
import { useInfiniteQuery } from '@tanstack/react-query';
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['marketplace', filter],
  queryFn: ({ pageParam }) => api.get(`/marketplace/tests?${new URLSearchParams({ cursorId: pageParam?.id ?? '', cursorPublishedAt: pageParam?.publishedAt ?? '' })}`),
  initialPageParam: null,
  getNextPageParam: (last) => last.nextCursor ?? undefined,
});
```

Detay: `pagination` skill'i.

**Query Key Hiyerarşisi:**
- `['tests']` → tüm test listeleri
- `['tests', { status: 'PUBLISHED' }]` → filtre
- `['tests', 'mine']` → kullanıcının kendi
- `['tests', id]` → tekil
- `['marketplace', filter]` → marketplace cursor listesi

Mutation sonrası `invalidateQueries({ queryKey: ['tests'] })` prefix invalidate eder.

## Form (Mutation)

Form pattern detayları için **`form-mutation`** skill'ine bak. Özet:

```jsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { z } from 'zod';
import api from '@/api/dalClient';

const CreateTestSchema = z.object({
  title: z.string().min(3),
  priceCents: z.number().int().min(100),
  durationMinutes: z.number().int().min(1),
});

export function CreateTestForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState({});

  const createTest = useMutation({
    mutationFn: (data) => api.post('/tests', data),
    onSuccess: (test) => {
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      navigate(`/test/${test.id}`);
    },
    onError: (err) => {
      if (err.fieldErrors) setErrors(err.fieldErrors);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = CreateTestSchema.safeParse(data);
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);
      return;
    }
    createTest.mutate(parsed.data);
  };

  // ...
}
```

## Dark Mode + Theme Persistency (next-themes)

Proje `next-themes ^0.4.4` yüklü ama henüz `App.jsx`'te aktif değil. Aktivasyon küçük bir iş.

### Provider Kurulumu

```jsx
// apps/frontend/src/App.jsx
import { ThemeProvider } from 'next-themes';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        attribute="class"           // <html class="dark"> moda göre toggle
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange   // tema değişiminde flash önlemi
      >
        <AuthProvider>
          <QueryClientProvider client={queryClientInstance}>
            <Router>
              <NavigationTracker />
              <AuthenticatedApp />
            </Router>
            <Toaster />
          </QueryClientProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
```

### Tailwind Config

`tailwind.config.js`'te `darkMode: 'class'`:

```js
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,html}'],
  theme: { /* ... */ },
};
```

### Toggle Component

```jsx
// apps/frontend/src/components/layout/ThemeToggle.jsx
import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Hydration mismatch'i engelle — ilk render'da tema bilinmiyor
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9" aria-hidden="true" />;

  const cycle = () => {
    setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light');
  };

  const Icon = theme === 'dark' ? Moon : theme === 'system' ? Monitor : Sun;
  const label = theme === 'dark' ? 'Karanlık tema' : theme === 'system' ? 'Sistem teması' : 'Aydınlık tema';

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`${label}. Değiştirmek için tıkla.`}
      className="inline-flex items-center justify-center w-9 h-9 rounded
                 hover:bg-gray-100 dark:hover:bg-gray-800
                 focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
```

### Dark Sınıflarını Kullanım

Tailwind `dark:` prefix:

```jsx
<div className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
  ...
</div>
```

**Önemli:** `bg-${theme}` gibi dinamik üretme — utility statik olmalı.

### Persistency

`next-themes` `localStorage`'da `theme` key'i tutar otomatik. SSR yok (Vite SPA), `suppressHydrationWarning`'a gerek yok ama `<html>`'in başlangıçta yanlış renkle parlamaması için inline script ekle:

```html
<!-- apps/frontend/index.html, <head> içinde -->
<script>
  (function() {
    try {
      const t = localStorage.getItem('theme');
      const system = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const dark = t === 'dark' || (t !== 'light' && system);
      if (dark) document.documentElement.classList.add('dark');
    } catch (e) {}
  })();
</script>
```

Bu script `next-themes` Provider yüklenmeden önce çalışıp doğru tema class'ını ekler — "white flash" sorunu olmaz.

## Error Boundary

Render-time hatalar için global boundary mevcut: `apps/frontend/src/components/ErrorBoundary.jsx` ve `App.jsx`'te root seviyede sarılı. Route bazlı ek boundary yazılabilir:

```jsx
<ErrorBoundary fallback={<RouteError />}>
  <Routes>{/* ... */}</Routes>
</ErrorBoundary>
```

## Loading State

**Spinner:** kısa loading (<1s) için.
**Skeleton:** liste/kart layout'u korumak için (>1s). `components/ui/skeleton.jsx` projede mevcut.

```jsx
import { Skeleton } from '@/components/ui/skeleton';

function ExamCardSkeleton() {
  return (
    <div className="rounded border p-4 space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

{isLoading
  ? Array.from({ length: 6 }).map((_, i) => <ExamCardSkeleton key={i} />)
  : exams.map((e) => <ExamCard key={e.id} exam={e} />)
}
```

## Accessibility

Temel kurallar burada özet — detaylı: `accessibility` skill'i.

- Semantic HTML: `<button>` `<form>` `<input>` `<nav>` `<main>` `<article>`.
- Form input'larında `<label htmlFor>` veya `aria-label`.
- Hata mesajları `role="alert"` + `aria-describedby` ile input'a bağlı.
- Modal için Radix UI primitives (focus trap dahil).
- `focus-visible:ring-2` görünür odak halkası.
- Renk kontrastı AA (4.5:1) — `text-gray-400 on bg-white` riskli.

Yeni sayfaya **mutlaka** axe-core e2e testi ekle (`accessibility` skill).

## Yapmayacakların

- Component içinde direkt `fetch`/`axios` — `dalClient` kullan.
- `useEffect` içinde fetch — TanStack Query kullan.
- `<a href>` SPA içi navigation için — `<Link to>` kullan.
- Button olmayan element'e onClick — a11y kırar.
- `style` inline — Tailwind kullan.
- Tailwind dinamik class (`bg-${color}-500`, `dark:bg-${...}`) — JIT taramaz.
- Default export — **sadece `pages/` altında React.lazy için istisna**.
- Server Component / Server Action öner — bu proje SPA.

## Hızlı Tanı — "Component Render Olmuyor"

| Belirti | Sebep |
|---------|-------|
| Boş ekran | Error throw etmiş, ErrorBoundary yutmuş veya yok |
| Sürekli yükleniyor | Query başarılı ama `isLoading` false dönmüyor — `enabled` kontrolü |
| Veri eski kalıyor | invalidateQueries yanlış key veya çağrılmamış |
| 404 sayfası açılıyor | Route tanımlı değil veya path yanlış |
| Component import error | Sayfa default export vermemiş (lazy import için zorunlu) |
| Tailwind class çalışmıyor | Dinamik class oluşturmuş, JIT göremiyor |
| Tema flash (white → dark) | `index.html`'e inline tema script'i eklenmemiş |
| Click çalışmıyor | onClick yanlış element'te (parent veya wrapper'da) |

## Checklist (her component için)

- [ ] Named export mu (sayfa ise default + named ikisi)?
- [ ] Props destructure ediliyor mu?
- [ ] Loading + error state'leri var mı?
- [ ] Semantic HTML + aria attribute'ları yerli yerinde mi?
- [ ] Tailwind dinamik class yok, sabit utility'ler mi?
- [ ] Dark mode için `dark:` varyantları eklendi mi?
- [ ] Component testi var mı (Vitest + Testing Library)?
- [ ] Mutation varsa `form-mutation` skill checklist'i çalıştırıldı mı?
- [ ] Yeni sayfa ise `pages.config.js` (lazy import) + `routeRoles.js` güncellendi mi?

Skill'ler: `form-mutation` form akışı için, `error-handling` hata yönetimi için, `api-contract` endpoint sözleşmesi için, `pagination` cursor listeler için, `accessibility` a11y için.
