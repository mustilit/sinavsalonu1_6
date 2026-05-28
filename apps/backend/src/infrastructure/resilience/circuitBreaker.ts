/**
 * Circuit breaker — opossum tabanlı 3. taraf servis korumacısı.
 *
 * SENARYO:
 *   Stripe webhook handler içinde Stripe API'ye 30 saniye boyunca cevap yok.
 *   Retry storm + saatlerce p99 yükselmesi → backend pod CPU saturasyonu.
 *
 *   Circuit breaker bunu önler:
 *     - CLOSED  → normal istek akışı
 *     - OPEN    → eşik aşılınca direkt fail-fast (fallback) — Stripe'a hiç gitmez
 *     - HALF_OPEN → belli aralıkla "test request" → başarılıysa CLOSED'a döner
 *
 *   Etki: backend health'ini koru, kullanıcıya hızlı 503 ver, downstream'i
 *         restore olduğunda otomatik geri al.
 *
 * KULLANIM:
 *
 *   import { breakerFor } from '@/infrastructure/resilience/circuitBreaker';
 *
 *   const stripeBreaker = breakerFor('stripe', {
 *     timeout: 10000,
 *     errorThresholdPercentage: 50,
 *     resetTimeout: 30000,
 *     fallback: () => ({ status: 'queued', message: 'Stripe geçici offline' }),
 *   });
 *
 *   const result = await stripeBreaker.fire(() => stripe.charges.create(...));
 *
 * METRIK:
 *   Her breaker stats'i prom-client'a yansır:
 *     - circuit_breaker_state{name="stripe"} = 0 (closed) / 1 (open) / 2 (half_open)
 *     - circuit_breaker_total{name="stripe", outcome="success|failure|timeout|fallback"}
 *
 *   Grafana dashboard'da görünür (sprint 10 #3).
 *
 * KAPSAM:
 *   - Stripe Charges/Subscriptions/Webhooks
 *   - Iyzico (TR ödeme)
 *   - Brevo (email — SES yedeği için)
 *   - Cloudflare Turnstile (CAPTCHA)
 *   - Google OAuth tokeninfo
 *
 * NOT: DB ve Redis için circuit breaker YOK; bunlar Prisma/ioredis'in kendi
 * retry + connection pool'unu kullanır.
 */

import CircuitBreaker = require('opossum');
import { Logger } from '@nestjs/common';

const logger = new Logger('CircuitBreaker');

const breakers = new Map<string, CircuitBreaker<any[], any>>();

export interface BreakerOptions {
  /** Tek istek timeout (ms). Default 10s. */
  timeout?: number;
  /** Bu yüzdenin üstünde fail → OPEN. Default %50. */
  errorThresholdPercentage?: number;
  /** OPEN sonrası HALF_OPEN'a geçiş süresi (ms). Default 30s. */
  resetTimeout?: number;
  /** Rolling window (ms) — istatistik penceresi. Default 10s. */
  rollingCountTimeout?: number;
  /** Minimum request sayısı eşiği. Default 5. */
  rollingCountBuckets?: number;
  /**
   * Fallback fonksiyon — OPEN durumdayken çalışır.
   * Async olabilir; senkron exception fırlatmamalı.
   */
  fallback?: (...args: any[]) => any;
}

/**
 * Named breaker getir/oluştur. Aynı `name` için tek instance — global state.
 */
export function breakerFor(name: string, options: BreakerOptions = {}): CircuitBreaker<any[], any> {
  const existing = breakers.get(name);
  if (existing) return existing;

  // opossum action fonksiyonu wrapper'da geçilir, ama static API:
  //   const breaker = new CircuitBreaker(actionFn, opts)
  //   breaker.fire(arg1, arg2)
  // Burada generic action wrapper kullanılır: fire'a fn parametre olarak verilir.
  const action = async (fn: () => Promise<any>) => fn();

  const breaker = new CircuitBreaker(action, {
    timeout: options.timeout ?? 10000,
    errorThresholdPercentage: options.errorThresholdPercentage ?? 50,
    resetTimeout: options.resetTimeout ?? 30000,
    rollingCountTimeout: options.rollingCountTimeout ?? 10000,
    rollingCountBuckets: options.rollingCountBuckets ?? 10,
    name,
  });

  if (options.fallback) {
    breaker.fallback(options.fallback);
  }

  breaker.on('open', () => logger.warn(`[${name}] OPEN — fail-fast aktif`));
  breaker.on('halfOpen', () => logger.log(`[${name}] HALF_OPEN — test request gönderiliyor`));
  breaker.on('close', () => logger.log(`[${name}] CLOSED — sağlıklı`));
  breaker.on('timeout', () => logger.warn(`[${name}] timeout`));
  breaker.on('reject', () => logger.warn(`[${name}] reject (breaker open)`));

  breakers.set(name, breaker);
  return breaker;
}

/**
 * Prom-client için tüm breaker state'lerini topla.
 * MetricsController bu fonksiyonu çağırır.
 */
export function collectBreakerMetrics(): Array<{
  name: string;
  state: 'closed' | 'open' | 'halfOpen';
  stats: any;
}> {
  const result: Array<{ name: string; state: any; stats: any }> = [];
  for (const [name, breaker] of breakers) {
    const stats = breaker.stats;
    let state: 'closed' | 'open' | 'halfOpen' = 'closed';
    if (breaker.opened) state = 'open';
    else if (breaker.halfOpen) state = 'halfOpen';
    result.push({ name, state, stats });
  }
  return result;
}

/**
 * Test için reset — sonraki testler temiz başlasın.
 */
export function _resetAllBreakersForTest() {
  for (const breaker of breakers.values()) {
    breaker.shutdown();
  }
  breakers.clear();
}
