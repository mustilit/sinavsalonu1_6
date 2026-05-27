/**
 * sendWindow utils testleri
 *
 * Doğrulanan davranışlar:
 * - isValidWindow: geçerli konfigürasyonlar
 * - isValidWindow: startHour >= endHour geçersiz
 * - isValidWindow: sınır dışı değerler geçersiz
 * - evaluateWindow: disabled konfigürasyonda her zaman inWindow:true
 * - evaluateWindow: pencere içinde inWindow:true
 * - evaluateWindow: pencere dışında inWindow:false ve delayMs > 0
 */

import { evaluateWindow, isValidWindow, type SendWindowConfig } from '../../src/application/services/email/utils/sendWindow';

describe('isValidWindow', () => {
  it('geçerli konfigürasyon kabul edilir', () => {
    expect(isValidWindow({ enabled: true, startHour: 8, endHour: 20, timezone: 'UTC' })).toBe(true);
    expect(isValidWindow({ enabled: true, startHour: 0, endHour: 24, timezone: 'UTC' })).toBe(true);
    expect(isValidWindow({ enabled: true, startHour: 9, endHour: 17, timezone: 'UTC' })).toBe(true);
  });

  it('startHour >= endHour geçersiz', () => {
    expect(isValidWindow({ enabled: true, startHour: 20, endHour: 8, timezone: 'UTC' })).toBe(false);
    expect(isValidWindow({ enabled: true, startHour: 10, endHour: 10, timezone: 'UTC' })).toBe(false);
  });

  it('negatif startHour geçersiz', () => {
    expect(isValidWindow({ enabled: true, startHour: -1, endHour: 8, timezone: 'UTC' })).toBe(false);
  });

  it('endHour 25 geçersiz', () => {
    expect(isValidWindow({ enabled: true, startHour: 0, endHour: 25, timezone: 'UTC' })).toBe(false);
  });

  it('startHour 24 geçersiz', () => {
    expect(isValidWindow({ enabled: true, startHour: 24, endHour: 25, timezone: 'UTC' })).toBe(false);
  });
});

describe('evaluateWindow', () => {
  it('disabled konfigürasyonda inWindow:true ve delayMs:0 döner', () => {
    const cfg: SendWindowConfig = { enabled: false, startHour: 8, endHour: 20, timezone: 'UTC' };
    const result = evaluateWindow(new Date(), cfg);
    expect(result.inWindow).toBe(true);
    expect(result.delayMs).toBe(0);
  });

  it('geçersiz konfigürasyon disabled gibi davranır', () => {
    const cfg: SendWindowConfig = { enabled: true, startHour: 20, endHour: 8, timezone: 'UTC' };
    const result = evaluateWindow(new Date(), cfg);
    expect(result.inWindow).toBe(true);
  });

  it('UTC saat 10 iken 8-20 penceresi içinde olunduğu tespit edilir', () => {
    // 10:00 UTC
    const now = new Date('2026-05-27T10:00:00Z');
    const cfg: SendWindowConfig = { enabled: true, startHour: 8, endHour: 20, timezone: 'UTC' };
    const result = evaluateWindow(now, cfg);
    expect(result.inWindow).toBe(true);
  });

  it('UTC saat 22 iken 8-20 penceresi dışında kalındığı tespit edilir', () => {
    // 22:00 UTC
    const now = new Date('2026-05-27T22:00:00Z');
    const cfg: SendWindowConfig = { enabled: true, startHour: 8, endHour: 20, timezone: 'UTC' };
    const result = evaluateWindow(now, cfg);
    expect(result.inWindow).toBe(false);
    expect((result as any).delayMs).toBeGreaterThan(0);
  });

  it('pencere dışında nextOpensAt gelecekte bir zaman olur', () => {
    const now = new Date('2026-05-27T22:00:00Z');
    const cfg: SendWindowConfig = { enabled: true, startHour: 8, endHour: 20, timezone: 'UTC' };
    const result = evaluateWindow(now, cfg);
    if (!result.inWindow) {
      expect(result.nextOpensAt.getTime()).toBeGreaterThan(now.getTime());
    }
  });
});
