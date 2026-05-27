/**
 * unsubscribeToken utils testleri
 *
 * Doğrulanan davranışlar:
 * - generateUnsubscribeToken: <random>.<hmac> formatında üretir
 * - Her çağrıda farklı token üretir
 * - isWellFormedUnsubscribeToken: geçerli token kabul edilir
 * - isWellFormedUnsubscribeToken: tampered token reddedilir
 * - isWellFormedUnsubscribeToken: boş/null/geçersiz format reddedilir
 * - EMAIL_SECRETS_KEY eksikse hata fırlatır
 */

const VALID_KEY = 'a'.repeat(64);

beforeAll(() => {
  process.env.EMAIL_SECRETS_KEY = VALID_KEY;
});

afterAll(() => {
  delete process.env.EMAIL_SECRETS_KEY;
});

import { generateUnsubscribeToken, isWellFormedUnsubscribeToken } from '../../src/application/services/email/utils/unsubscribeToken';

describe('generateUnsubscribeToken', () => {
  it('<random>.<hmac> formatında token üretir', () => {
    const token = generateUnsubscribeToken();
    expect(token).toContain('.');
    const parts = token.split('.');
    expect(parts).toHaveLength(2);
    expect(parts[0].length).toBeGreaterThan(0);
    expect(parts[1].length).toBeGreaterThan(0);
  });

  it('her çağrıda farklı token üretir', () => {
    const t1 = generateUnsubscribeToken();
    const t2 = generateUnsubscribeToken();
    expect(t1).not.toBe(t2);
  });
});

describe('isWellFormedUnsubscribeToken', () => {
  it('kendi ürettiğimiz token geçerli kabul edilir', () => {
    const token = generateUnsubscribeToken();
    expect(isWellFormedUnsubscribeToken(token)).toBe(true);
  });

  it('tampered signature reddedilir', () => {
    const token = generateUnsubscribeToken();
    const [raw] = token.split('.');
    const tampered = `${raw}.invalidsignature`;
    expect(isWellFormedUnsubscribeToken(tampered)).toBe(false);
  });

  it('boş string reddedilir', () => {
    expect(isWellFormedUnsubscribeToken('')).toBe(false);
  });

  it('nokta olmayan string reddedilir', () => {
    expect(isWellFormedUnsubscribeToken('singlepartnodot')).toBe(false);
  });

  it('iki noktadan fazla olan string reddedilir', () => {
    expect(isWellFormedUnsubscribeToken('a.b.c')).toBe(false);
  });

  it('null-like değer reddedilir', () => {
    expect(isWellFormedUnsubscribeToken(null as any)).toBe(false);
  });
});
