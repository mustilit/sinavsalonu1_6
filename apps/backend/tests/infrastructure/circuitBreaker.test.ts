import {
  breakerFor,
  collectBreakerMetrics,
  _resetAllBreakersForTest,
} from '../../src/infrastructure/resilience/circuitBreaker';

describe('circuitBreaker (opossum)', () => {
  beforeEach(() => {
    _resetAllBreakersForTest();
  });

  it('aynı isimle çağırınca aynı instance döner', () => {
    const a = breakerFor('test1');
    const b = breakerFor('test1');
    expect(a).toBe(b);
  });

  it('başarılı action çağırınca sonucu döner', async () => {
    const breaker = breakerFor('test-success', { timeout: 1000 });
    const result = await breaker.fire(async () => 42);
    expect(result).toBe(42);
  });

  it('action throw ederse breaker hata fırlatır', async () => {
    const breaker = breakerFor('test-fail', { timeout: 1000 });
    await expect(breaker.fire(async () => { throw new Error('boom'); })).rejects.toThrow('boom');
  });

  it('timeout aşılırsa TimeoutError fırlatır', async () => {
    const breaker = breakerFor('test-timeout', { timeout: 50 });
    await expect(
      breaker.fire(async () => new Promise((r) => setTimeout(r, 200))),
    ).rejects.toThrow();
  });

  it('fallback action sağlanmışsa OPEN durumda fallback değeri döner', async () => {
    const breaker = breakerFor('test-fallback', {
      timeout: 50,
      errorThresholdPercentage: 1, // 1% — ilk fail'da OPEN
      resetTimeout: 60_000,
      rollingCountBuckets: 1,
      fallback: () => ({ fallback: true }),
    });
    // İlk birkaç çağrıyla breaker'ı OPEN'a düşür
    try {
      await breaker.fire(async () => { throw new Error('boom'); });
    } catch { /* ignore */ }
    // Sonraki çağrı fallback'e düşer
    const result = await breaker.fire(async () => 999);
    expect(result).toEqual({ fallback: true });
  });

  it('collectBreakerMetrics tüm breaker state\'lerini döner', async () => {
    breakerFor('m1');
    breakerFor('m2');
    const metrics = collectBreakerMetrics();
    expect(metrics.length).toBeGreaterThanOrEqual(2);
    expect(metrics.find((m) => m.name === 'm1')?.state).toBe('closed');
    expect(metrics.find((m) => m.name === 'm2')?.state).toBe('closed');
  });
});
