/**
 * pwa.js — service worker registration + update lifecycle.
 *
 * Sprint 11 #3.
 *
 * vite-plugin-pwa `registerType: 'autoUpdate'` ile build sırasında SW oluşturulur
 * ve build hash'i değişince kullanıcı bir sonraki sayfa açılışında yeni sürümü
 * alır. Bu helper:
 *   - Production'da SW kayıt eder
 *   - Update bulunca console'a log düşer (üretim telemetrisi)
 *   - "offline" event'inde basit bir flag set eder (UI bunu Sidebar'da gösterebilir)
 *
 * Test/dev: kayıt atlanır (devOptions.enabled=false).
 */

import { registerSW } from 'virtual:pwa-register';

let cleanupOnlineListeners = null;

/**
 * SW kayıt + online/offline event'lerini ayağa kaldır.
 *
 * App.jsx'in en üst seviyesinden bir kez çağrılır.
 */
export function setupPwa() {
  // Prod build dışında virtual modül `noop` döner — try/catch'e gerek yok.
  try {
    registerSW({
      immediate: true,
      onRegistered(reg) {
         
        if (reg) console.info('[PWA] service worker registered', reg.scope);
      },
      onRegisterError(err) {
         
        console.warn('[PWA] SW register error', err);
      },
      onNeedRefresh() {
        // autoUpdate stratejisinde manuel prompt'a gerek yok; bilgi amaçlı log.
         
        console.info('[PWA] yeni sürüm hazır — sonraki açılışta uygulanacak');
      },
      onOfflineReady() {
         
        console.info('[PWA] çevrimdışı kullanım hazır');
      },
    });
  } catch (e) {
    // Virtual modül yüklenememiş (test ortamı)
     
    console.warn('[PWA] registerSW skipped', e?.message);
  }

  // Online/offline durumu — tüketici componentler `window.__sinavSalonuOffline`
  // veya basit bir event listener üzerinden okur.
  const setOnline = () => {
    window.__sinavSalonuOffline = false;
    window.dispatchEvent(new CustomEvent('sinavsalonu:online'));
  };
  const setOffline = () => {
    window.__sinavSalonuOffline = true;
    window.dispatchEvent(new CustomEvent('sinavsalonu:offline'));
  };
  // İlk değer
  window.__sinavSalonuOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
  window.addEventListener('online', setOnline);
  window.addEventListener('offline', setOffline);

  cleanupOnlineListeners = () => {
    window.removeEventListener('online', setOnline);
    window.removeEventListener('offline', setOffline);
  };
}

export function teardownPwa() {
  if (cleanupOnlineListeners) cleanupOnlineListeners();
  cleanupOnlineListeners = null;
}
