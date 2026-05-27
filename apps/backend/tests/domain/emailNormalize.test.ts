/**
 * emailNormalize utils testleri
 *
 * Doğrulanan davranışlar:
 * - normalizeEmail: uppercase → lowercase
 * - normalizeEmail: baş/sondaki boşluklar temizlenir
 * - normalizeEmail: plus-addressing korunur
 * - isValidEmail: geçerli formatlar kabul edilir
 * - isValidEmail: @ içermeyen reddedilir
 * - isValidEmail: 254 karakteri aşan reddedilir
 */

import { normalizeEmail, isValidEmail } from '../../src/application/services/email/utils/emailNormalize';

describe('normalizeEmail', () => {
  it('büyük harf karakterleri küçük harfe çevirir', () => {
    expect(normalizeEmail('TEST@EXAMPLE.COM')).toBe('test@example.com');
  });

  it('baş ve sondaki boşlukları temizler', () => {
    expect(normalizeEmail('  user@example.com  ')).toBe('user@example.com');
  });

  it('plus-addressing korunur', () => {
    expect(normalizeEmail('user+tag@example.com')).toBe('user+tag@example.com');
  });

  it('alt çizgi içeren email normalize edilir', () => {
    expect(normalizeEmail('First_Last@Company.COM')).toBe('first_last@company.com');
  });
});

describe('isValidEmail', () => {
  it('geçerli formatlar kabul edilir', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user+tag@mail.org')).toBe(true);
    expect(isValidEmail('a@b.io')).toBe(true);
  });

  it('@ içermeyen reddedilir', () => {
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('user.example.com')).toBe(false);
  });

  it('boş string reddedilir', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('254 karakterden uzun reddedilir', () => {
    const longEmail = 'a'.repeat(250) + '@b.com';
    expect(isValidEmail(longEmail)).toBe(false);
  });

  it('iki @ içeren reddedilir', () => {
    expect(isValidEmail('user@@example.com')).toBe(false);
  });
});
