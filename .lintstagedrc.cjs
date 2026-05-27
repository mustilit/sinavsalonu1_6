/**
 * lint-staged config — Sınav Salonu monorepo.
 *
 * Function form kullanılır çünkü:
 *   - Backend tsc tüm projeyi kontrol eder (staged dosya argümanı kabul etmez)
 *   - Frontend ESLint relative path'i kendi tsconfig'inden çözümler
 *   - Windows + monorepo'da `cd subdir &&` güvensiz
 *
 * Hook'u atlamak için: git commit --no-verify (önerilmez).
 */

const path = require('path');

module.exports = {
  // Backend TS dosyaları staged ise → tüm backend project'i tsc --noEmit
  // (tek dosya bağlam izolasyonu yapmak monorepo'da risk; full check güvenli).
  'apps/backend/**/*.ts': () => [
    'npm --prefix apps/backend run typecheck',
  ],

  // Frontend JS/JSX staged ise → ESLint --fix, sadece staged dosyalar.
  // Path'ler repo root'tan absolute olarak verilir.
  'apps/frontend/**/*.{js,jsx}': (files) => {
    if (files.length === 0) return [];
    const args = files.map((f) => `"${path.relative('apps/frontend', f).replace(/\\/g, '/')}"`).join(' ');
    return [`npm --prefix apps/frontend exec -- eslint --fix --no-warn-ignored ${args}`];
  },
};
