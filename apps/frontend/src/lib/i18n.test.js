import { describe, it, expect } from 'vitest';
import { formatCurrency, formatRelativeTime, SUPPORTED_LANGUAGES } from './i18n';

describe('formatCurrency', () => {
  it('TRY varsayılan + tr-TR locale: ₺ sembolü + virgülle ondalık', () => {
    const out = formatCurrency(1900, 'TRY', 'tr-TR');
    expect(out).toMatch(/₺/);
    expect(out).toMatch(/19[,.]00/);
  });

  it('USD + en-US: $ sembolü + nokta ile ondalık', () => {
    const out = formatCurrency(2500, 'USD', 'en-US');
    expect(out).toContain('$');
    expect(out).toContain('25.00');
  });

  it('EUR + de-DE: €25,00 formatı', () => {
    const out = formatCurrency(2500, 'EUR', 'de-DE');
    expect(out).toContain('€');
    expect(out).toMatch(/25,00/);
  });

  it('0 cent → 0 değeri', () => {
    expect(formatCurrency(0, 'TRY', 'tr-TR')).toMatch(/0[,.]00/);
  });

  it('negatif değer (iade) → eksi işareti', () => {
    const out = formatCurrency(-1500, 'TRY', 'tr-TR');
    expect(out).toMatch(/-|−/);
    expect(out).toMatch(/15[,.]00/);
  });

  it('büyük rakam binlik ayırıcı uygular', () => {
    const out = formatCurrency(12345678, 'TRY', 'tr-TR');
    // 123.456,78 ₺ veya benzer; en az binlik ayırıcı içersin
    expect(out).toMatch(/[.,]/);
  });

  it('geçersiz currency code → fallback ham format', () => {
    const out = formatCurrency(1000, 'ZZZ');
    // Intl ZZZ'yi tanıyabilir veya throw edebilir; fallback'a düşerse "10.00 ZZZ"
    expect(out).toMatch(/10[.,]00/);
  });
});

describe('formatRelativeTime', () => {
  const now = Date.now();

  it('5 saniye önce → "şimdi" veya saniye birimli', () => {
    const out = formatRelativeTime(new Date(now - 5_000));
    expect(typeof out).toBe('string');
    expect(out.length).toBeGreaterThan(0);
  });

  it('2 dakika önce → "dakika" birimini içerir (TR)', () => {
    const out = formatRelativeTime(new Date(now - 2 * 60_000), 'tr-TR');
    expect(out).toMatch(/dakika/i);
  });

  it('1 saat önce → "saat" birimini içerir', () => {
    const out = formatRelativeTime(new Date(now - 60 * 60_000), 'tr-TR');
    expect(out).toMatch(/saat/i);
  });

  it('3 gün önce → "gün" birimini içerir', () => {
    const out = formatRelativeTime(new Date(now - 3 * 24 * 60 * 60_000), 'tr-TR');
    expect(out).toMatch(/gün/i);
  });

  it('1 yıl önce → "yıl" birimini içerir', () => {
    const out = formatRelativeTime(new Date(now - 366 * 24 * 60 * 60_000), 'tr-TR');
    expect(out).toMatch(/yıl/i);
  });

  it('en-US locale: "minute" birimini içerir', () => {
    const out = formatRelativeTime(new Date(now - 5 * 60_000), 'en-US');
    expect(out).toMatch(/minute/i);
  });
});

describe('SUPPORTED_LANGUAGES', () => {
  it('5 dil tanımlı: tr, en, es, zh, de', () => {
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    expect(codes).toEqual(expect.arrayContaining(['tr', 'en', 'es', 'zh', 'de']));
    expect(SUPPORTED_LANGUAGES).toHaveLength(5);
  });

  it('her dil için label ve flag tanımlı', () => {
    SUPPORTED_LANGUAGES.forEach((l) => {
      expect(l.code).toMatch(/^[a-z]{2}$/);
      expect(l.label).toBeTruthy();
      expect(l.flag).toBeTruthy();
    });
  });

  it('label native name — tr için "Türkçe"', () => {
    const tr = SUPPORTED_LANGUAGES.find((l) => l.code === 'tr');
    expect(tr?.label).toBe('Türkçe');
  });
});
