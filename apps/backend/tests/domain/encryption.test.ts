/**
 * AES-256-GCM encryption utils testleri
 *
 * Doğrulanan davranışlar:
 * - encryptSecret + decryptSecret round-trip
 * - Farklı plaintext → farklı ciphertext (IV randomness)
 * - EMAIL_SECRETS_KEY eksikse hata fırlatır
 * - Kısa payload decryptSecret'i yakalar
 * - encryptJson + decryptJson round-trip
 * - maskSecret: null/undefined için boş string
 * - maskSecret: kısa değer için ••••
 * - maskSecret: uzun değerde ilk 2 + •••• + son 2
 */

import { encryptSecret, decryptSecret, encryptJson, decryptJson, maskSecret } from '../../src/application/services/email/utils/encryption';

const VALID_KEY = '0'.repeat(64);

beforeAll(() => {
  process.env.EMAIL_SECRETS_KEY = VALID_KEY;
});

afterAll(() => {
  delete process.env.EMAIL_SECRETS_KEY;
});

describe('encryptSecret + decryptSecret', () => {
  it('round-trip doğru çalışır', () => {
    const plain = 'my-api-key-12345';
    const encrypted = encryptSecret(plain);
    expect(decryptSecret(encrypted)).toBe(plain);
  });

  it('aynı plaintext iki kez şifrelense farklı ciphertext üretir (random IV)', () => {
    const plain = 'same-secret';
    const enc1 = encryptSecret(plain);
    const enc2 = encryptSecret(plain);
    expect(enc1).not.toBe(enc2);
  });

  it('kısa payload decryptSecret hata fırlatır', () => {
    expect(() => decryptSecret('YWJj')).toThrow();
  });

  it('EMAIL_SECRETS_KEY eksikse hata fırlatır', () => {
    const original = process.env.EMAIL_SECRETS_KEY;
    delete process.env.EMAIL_SECRETS_KEY;
    expect(() => encryptSecret('test')).toThrow(/EMAIL_SECRETS_KEY/);
    process.env.EMAIL_SECRETS_KEY = original;
  });
});

describe('encryptJson + decryptJson', () => {
  it('round-trip doğru çalışır', () => {
    const obj = { apiKey: 'key123', host: 'smtp.example.com', port: 587 };
    const encrypted = encryptJson(obj);
    const decrypted = decryptJson<typeof obj>(encrypted);
    expect(decrypted).toEqual(obj);
  });
});

describe('maskSecret', () => {
  it('null için boş string döner', () => {
    expect(maskSecret(null)).toBe('');
  });

  it('undefined için boş string döner', () => {
    expect(maskSecret(undefined)).toBe('');
  });

  it('4 karakter veya altı için ••••', () => {
    expect(maskSecret('ab')).toBe('••••');
    expect(maskSecret('abcd')).toBe('••••');
  });

  it('uzun değer için ilk 2 + •••• + son 2 döner', () => {
    expect(maskSecret('ab12345678yz')).toBe('ab••••yz');
  });
});
