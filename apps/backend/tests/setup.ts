/**
 * Jest setup:
 * 1) Test-only env değerlerini set et — env.ts zod validatörü DATABASE_URL/JWT_SECRET
 *    eksikse process'i exit eder. Test'lerde gerçek DB'ye değmiyoruz ama validator'ı
 *    geçmek için placeholder URL gerekli. NODE_ENV=test ek kontrolleri pas geçer.
 * 2) Global crypto polyfill — @nestjs/schedule ve diğer deps Node 18 crypto'ya bağlı.
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test-jwt-secret-at-least-32-chars-for-test-only';
process.env.REDIS_DISABLED = process.env.REDIS_DISABLED || '1';
process.env.CRON_DISABLED = process.env.CRON_DISABLED || '1';
process.env.THROTTLE_DISABLED = process.env.THROTTLE_DISABLED || '1';

import { webcrypto } from 'node:crypto';

if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = webcrypto;
}
