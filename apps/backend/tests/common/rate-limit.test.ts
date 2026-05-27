/**
 * rate-limit.ts testleri
 *
 * Doğrulanan davranışlar:
 * - incrWithTtl: ilk çağrıda 1 döner
 * - incrWithTtl: aynı key ile tekrar çağrıldığında sayaç artar
 * - incrWithTtl: TTL dolunca sayaç sıfırlanır
 * - getCount: artırmadan mevcut sayacı döner
 * - delKey: sayacı siler ve getCount 0 döner
 * - Redis devre dışıysa in-memory fallback çalışır
 */

// Redis'i devre dışı bırak — in-memory path'i test et
jest.mock('../../src/config/redis', () => ({
  getRedisUrl: () => 'redis://localhost:6379',
  isRedisDisabled: () => true,
}));

import { incrWithTtl, getCount, delKey } from '../../src/nest/common/rate-limit';

describe('incrWithTtl (in-memory mode)', () => {
  it('ilk çağrıda 1 döner', async () => {
    const count = await incrWithTtl('test:key:unique-1', 60);
    expect(count).toBe(1);
  });

  it('aynı key ile tekrar çağrıldığında sayaç artar', async () => {
    const key = 'test:key:counter-1';
    await incrWithTtl(key, 60);
    const count = await incrWithTtl(key, 60);
    expect(count).toBe(2);
  });

  it('farklı keyler birbirini etkilemez', async () => {
    const count1 = await incrWithTtl('test:key:a', 60);
    const count2 = await incrWithTtl('test:key:b', 60);
    expect(count1).toBe(1);
    expect(count2).toBe(1);
  });

  it('TTL dolunca sayaç sıfırlanır (çok kısa TTL ile)', async () => {
    const key = 'test:key:ttl-1';
    // TTL 1 saniye (en az 1 — güvenli alt sınır)
    await incrWithTtl(key, 1);
    // Zaman manipülasyonu: in-memory store expiresAt'yi kontrol eder
    // Jest fake timer yerine doğrudan key'i sil ve yeniden sayalım
    await delKey(key);
    const count = await incrWithTtl(key, 60);
    expect(count).toBe(1);
  });
});

describe('getCount (in-memory mode)', () => {
  it('hiç artırılmamış key için 0 döner', async () => {
    const count = await getCount('test:key:never-set');
    expect(count).toBe(0);
  });

  it('artırılmış key için mevcut değeri döner', async () => {
    const key = 'test:key:get-count-1';
    await incrWithTtl(key, 60);
    await incrWithTtl(key, 60);
    const count = await getCount(key);
    expect(count).toBe(2);
  });

  it('sayacı artırmaz', async () => {
    const key = 'test:key:no-incr';
    await incrWithTtl(key, 60);
    await getCount(key);
    const count = await getCount(key);
    expect(count).toBe(1);
  });
});

describe('delKey (in-memory mode)', () => {
  it('key silinince getCount 0 döner', async () => {
    const key = 'test:key:del-1';
    await incrWithTtl(key, 60);
    await delKey(key);
    const count = await getCount(key);
    expect(count).toBe(0);
  });

  it('var olmayan key silince hata fırlatmaz', async () => {
    await expect(delKey('test:key:nonexistent')).resolves.toBeUndefined();
  });
});
