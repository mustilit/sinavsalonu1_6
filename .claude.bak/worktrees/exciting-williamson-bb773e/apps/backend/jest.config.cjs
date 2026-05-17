// ADIM 24: .test.ts çalışsın (ts-jest). Doğrulama: npm install && npm run test:integration
// (Integration testleri DB/Redis gerektirebilir; en az 1 .test.ts dosyasının compile/transform edilmesi bu config ile sağlanır.)
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
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  testPathIgnorePatterns: ['<rootDir>/dist/'],
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: './test-reports', outputName: 'junit.xml' }]
  ],
  collectCoverage: false,
  coverageDirectory: './coverage',
  coveragePathIgnorePatterns: ['/node_modules/'],
  coverageThreshold: {
    global: {
      branches: 25,
      functions: 30,
      lines: 35,
      statements: 35,
    },
  },
};

