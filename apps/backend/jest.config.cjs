// Jest configuration — Sınav Salonu backend
//
// Coverage threshold disiplini (KALITE-DEGERLENDIRME §11 — Test Kalitesi):
//   - Global baseline: bugünkü dağılım üzerinde (statements/lines %35, branches %25,
//     functions %30). PR'da düşme kabul edilmez; çeyrek sonunda +%5 hedef.
//   - Use case katmanı: %85 hedef (henüz baseline değil, kademeli sıkılaştırılacak —
//     başlangıçta global ile aynı, refactor sonrası `coverageThreshold` içinden
//     yorum kaldırılır).
//   - Domain saf kod: %95 hedef (aynı).
//
// Çalıştırma:
//   npm test                          → tüm test'ler, coverage kapalı
//   npm test -- --coverage            → tek seferlik coverage raporu (text + lcov + html)
//   npm run test:unit:ci              → CI: --runInBand --coverage --coverageDirectory=./coverage
//
// Codecov: lcov.info ./coverage altına düşüyor; .github/workflows üzerinden yüklenir.
module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/setup.ts'],
  testTimeout: 20000,
  verbose: true,
  testMatch: ['**/tests/**/*.test.(js|ts)'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/.stryker-tmp/'],
  testPathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/.stryker-tmp/'],
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: './test-reports', outputName: 'junit.xml' }],
  ],
  collectCoverage: false,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.module.ts',
    '!src/**/index.ts',
    '!src/main.ts',
    '!src/index.ts',
    '!src/instrument.ts',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'json-summary', 'html'],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/prisma/', '/scripts/'],
  // Threshold disiplini:
  //   Bugünkü baseline ile başla; PR'da düşmesin. Her sprint hedefe doğru sıkıştır.
  //   Path-spesifik threshold'lar (use-cases, guards) aktarılmadan önce
  //   o klasördeki test coverage'ı baseline'a ulaşmalı; yoksa CI sürekli kırmızı kalır.
  coverageThreshold: {
    // Global baseline — 18 May 2026 ölçüm: stmts %16, branches %13, funcs %12, lines %17
    // CI'ı kırmadan PR'da düşmeyi önlemek için gerçek baseline'a göre ayarlandı.
    // Her sprint +2-3 puan sıkıştırılacak; hedef çeyrek sonunda: stmts %30, branches %20.
    global: {
      branches: 12,
      functions: 11,
      lines: 16,
      statements: 16,
    },
    // Use-cases katmanı: 220 test + 38 suite sonrası baseline aktif edildi.
    // 18 May 2026 ölçüm: stmts %28.7, branches %25.3, funcs %24.4, lines %29.8
    // Hedef: kademeli olarak branches %70, functions %80'e çıkarılacak.
    './src/application/use-cases/': {
      branches: 24,
      functions: 23,
      lines: 28,
      statements: 27,
    },
    // Path-spesifik baseline — sadece yeni eklenen testlerin kapsadığı klasörler.
    // Yeni dosya/branch eklerken PR'da düşmeyi engeller.
    // 24 May 2026 ölçümünden sonraki bir tur sonraki PR'da +%5 hedef.
    './src/nest/guards/': {
      // worker-permissions + internal-only test'leri eklendi (Roles/Jwt/Captcha
      // hâlâ açık). Diğer guard'lar test edilmediği için baseline düşük tutulur.
      statements: 25,
      branches: 20,
      functions: 25,
      lines: 25,
    },
    './src/nest/interceptors/': {
      // metrics + idempotency interceptor test'leri.
      statements: 60,
      branches: 50,
      functions: 60,
      lines: 60,
    },
    './src/common/': {
      // tenant context AsyncLocalStorage testi eklendi.
      statements: 60,
      branches: 50,
      functions: 70,
      lines: 60,
    },
    // './src/domain/': { branches: 85, functions: 90, lines: 90, statements: 90 },
  },
};

