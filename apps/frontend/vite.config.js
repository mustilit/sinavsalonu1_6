import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import { visualizer } from 'rollup-plugin-visualizer'
import { compression } from 'vite-plugin-compression2'
import { VitePWA } from 'vite-plugin-pwa'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Windows'ta localhost → IPv6 (::1) farklı process'e gidebiliyor; IPv4 sabitle
const backendTarget = 'http://127.0.0.1:3000'
const srcPath = path.resolve(__dirname, 'src')

export default defineConfig({
  plugins: [
    react(),
    // Sprint 11 #1 — Build sırasında pre-compressed .br ve .gz dosyaları üret.
    // nginx brotli_static + gzip_static bu dosyaları runtime'da sıkıştırma yapmadan
    // direkt servis eder (CPU tasarrufu + en yüksek kalite sıkıştırma).
    // Sadece prod build (NODE_ENV=production) — dev'de gereksiz disk yazımı yok.
    compression({
      algorithm: 'brotliCompress',
      include: /\.(js|mjs|json|css|html|svg|wasm)(\?.*)?$/i,
      threshold: 1024, // 1KB altı dosyalar sıkıştırma overhead'i yapmaz
      deleteOriginalAssets: false,
    }),
    compression({
      algorithm: 'gzip',
      include: /\.(js|mjs|json|css|html|svg|wasm)(\?.*)?$/i,
      threshold: 1024,
      deleteOriginalAssets: false,
    }),
    // Sprint 11 #3 — PWA + service worker.
    //
    // Strateji:
    //   - registerType: 'autoUpdate' → SW kendi kendini günceller, kullanıcı bir
    //     sonraki açılışta yeni sürümü alır. Manuel "yeni sürüm var, yenile" prompt
    //     UX'i tercih edilirse: 'prompt' yapıp `useRegisterSW` ile yönet.
    //   - Workbox runtime caching:
    //       * fonts (Google Fonts veya self-hosted): cache-first, 30 gün
    //       * images: stale-while-revalidate, 7 gün
    //       * /uploads/ (Sharp pipeline çıktıları): cache-first, 30 gün — hash'li URL
    //       * API (/marketplace, /tests, /me): network-first, 1 dakika fallback
    //   - Navigation fallback: SPA route'u 404 olursa index.html (offline shell).
    //
    // CSP UYUMU: SW kendi origin'inden serve edildiği için ek CSP gerekmez.
    // Workbox CDN'den değil, bundle'a inline edilir.
    VitePWA({
      registerType: 'autoUpdate',
      // public/manifest.json'un yerini alır — tek doğru kaynak burası.
      manifest: {
        name: 'Sınav Salonu',
        short_name: 'SinavSalonu',
        description: 'Test marketplace — eğiticiler hazırlar, adaylar çözer.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#4f46e5',
        lang: 'tr',
        dir: 'ltr',
        orientation: 'portrait',
        icons: [
          {
            src: '/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        // iOS Safari özel: apple-touch-icon link <head>'e elle eklendi (index.html).
      },
      // public/manifest.json'un kendisini overwrite etmemize gerek yok — plugin
      // dist/manifest.webmanifest üretir; <link rel="manifest"> auto-injected.
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'pwa-source.svg'],
      workbox: {
        // Bundle dışındaki asset'leri precache et — JS/CSS/HTML otomatik dahil.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // SPA fallback: bilinmeyen route → index.html (offline'da bile shell açılır)
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/auth\//,
          /^\/marketplace\//,
          /^\/admin\//,
          /^\/me\//,
          /^\/uploads\//,
        ],
        runtimeCaching: [
          // Google Fonts (varsa)
          {
            urlPattern: ({ url }) => /fonts\.(googleapis|gstatic)\.com/.test(url.hostname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'gfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Backend tarafından serve edilen kullanıcı görselleri
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/uploads/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'user-uploads',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Marketplace, test listeleri — read-only ve invalidation tolere edilir
          {
            urlPattern: ({ url }) =>
              ['/marketplace', '/tests', '/educators', '/site', '/home'].some((p) =>
                url.pathname.startsWith(p),
              ),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-readonly',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 5 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        // Skip waiting → yeni SW hemen aktif, sayfa yenilenince yeni asset'ler.
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: {
        // Dev server'da SW'i devre dışı bırak — hot reload + service worker
        // kombinasyonu Vite dev'i sık sık eski cache'le bozar.
        enabled: false,
      },
    }),
    // ANALYZE=1 npm run build → dist/stats.html üretir, CI artifact'ı olarak yüklenebilir
    process.env.ANALYZE === '1' && visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap',
    }),
  ].filter(Boolean),
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    // Sadece proje testlerini topla (node_modules testleri çalışmamalı)
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', 'e2e/**'],
    // Coverage disiplini — KALITE-DEGERLENDIRME §11
    //   npm run test:coverage ile çalıştır; CI artifact olarak lcov.info upload edilir.
    //   Threshold'lar şimdilik düşük tutuldu; yeni testler eklendikçe +%5/sprint.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/**/*.{test,spec}.{js,jsx}',
        'src/test/**',
        'src/main.jsx',
        'src/**/*.config.{js,cjs}',
        'src/components/ui/**', // shadcn primitives — upstream test'leri yeterli
        'src/pages.config.js',
      ],
      thresholds: {
        // 24 May 2026 baseline (drift'siz tam çalıştırmada): stmt %5.86, br %35.31,
        // fn %13.42, lines %5.86. Page-level component testleri eklendikçe yukarı
        // çek. Aynı sprintte sonraki PR'da düşmesin diye gerçek baseline -1 puan.
        statements: 5,
        branches: 30,
        functions: 12,
        lines: 5,
        // Path-spesifik strict baseline — yeni testlerin kapsadığı kritik utility'ler.
        // Gerçek ölçüm: routeRoles.js %100, i18n.js %93/63/75/93, dalClient.js %35/48/6/35.
        'src/lib/i18n.js': {
          statements: 90,
          branches: 60,
          functions: 70,
          lines: 90,
        },
        'src/lib/routeRoles.js': {
          statements: 100,
          branches: 95,
          functions: 100,
          lines: 100,
        },
        'src/api/dalClient.js': {
          statements: 30,
          branches: 40,
          functions: 5,
          lines: 30,
        },
      },
    },
  },
  resolve: {
    alias: [
      { find: /^@\/(.*)$/, replacement: `${srcPath}/$1` },
    ],
  },
  server: {
    host: true,
    port: Number(process.env.PORT) || 5174,
    proxy: {
      '/auth': { target: backendTarget, changeOrigin: true },
      '/marketplace': { target: backendTarget, changeOrigin: true },
      '/tests': { target: backendTarget, changeOrigin: true },
      '/site': { target: backendTarget, changeOrigin: true },
      '/me': { target: backendTarget, changeOrigin: true },
      '/admin': { target: backendTarget, changeOrigin: true },
      '/educators': { target: backendTarget, changeOrigin: true },
      '/home': { target: backendTarget, changeOrigin: true },
      '/follows': { target: backendTarget, changeOrigin: true },
      '/objections': { target: backendTarget, changeOrigin: true },
      '/purchases': { target: backendTarget, changeOrigin: true },
      '/attempts': { target: backendTarget, changeOrigin: true },
      '/refunds': { target: backendTarget, changeOrigin: true },
      '/ad-packages': { target: backendTarget, changeOrigin: true },
      '/notifications': { target: backendTarget, changeOrigin: true },
      '/upload': { target: backendTarget, changeOrigin: true },
      '/packages': { target: backendTarget, changeOrigin: true },
      '/docs': { target: backendTarget, changeOrigin: true },
      '/health': { target: backendTarget, changeOrigin: true },
      '/live-sessions': { target: backendTarget, changeOrigin: true },
    },
  },
});