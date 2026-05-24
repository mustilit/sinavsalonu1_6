import '@testing-library/jest-dom';
import { afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';

// i18n provider'ı her test öncesi TR locale ile yükle — testler `t('auth.login.title')`
// raw key yerine "Giriş Yap" Türkçe metni görsün. Side-effect import — i18n.init()
// modül yüklenir yüklenmez resources'ı kayıt eder.
//
// LanguageDetector test ortamında jsdom navigator'dan 'en' okuyup açıyor; testler
// TR metnine göre yazıldığı için (component i18n'den önce hardcoded TR'idi)
// dili açıkça 'tr' olarak sabitliyoruz. Yeni testler dil-agnostic yazılmalı
// (data-testid veya role bazlı, çeviri metni değil).
import i18n from '../lib/i18n';
i18n.changeLanguage('tr');

// jsdom'da ResizeObserver yok; Radix Slider vb. için mock
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});
