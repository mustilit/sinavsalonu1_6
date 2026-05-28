import { Injectable, OnApplicationShutdown, Logger, Inject, Optional } from '@nestjs/common';
import { basePrisma } from '../../infrastructure/database/prisma';
import { RedisCache } from '../../infrastructure/cache/RedisCache';
import * as Sentry from '@sentry/node';

/**
 * Graceful shutdown koordinatörü.
 *
 * NestJS `app.enableShutdownHooks()` SIGTERM/SIGINT'te bu service'in
 * onApplicationShutdown metodunu çağırır. Provider'lar bağımsız
 * onModuleDestroy implementasyon edebilirler; bu service de cross-cutting
 * concern'leri kapatır:
 *
 *   1. Prisma $disconnect — active query'lerin bitmesini bekle (max 5s)
 *   2. Redis cache (RedisCache singleton) quit
 *   3. Sentry flush — pending event'leri 2s içinde gönder
 *   4. Log: shutdown reason + duration
 *
 * BullMQ worker'ları ayrı pod'da (worker-deployment.yaml); onların graceful
 * shutdown'ı worker process'inin kendi SIGTERM handler'ında.
 *
 * K8s preStop hook: değer 5 saniye olarak set edilmeli ki LoadBalancer
 * endpoint listesinden bu pod düşene kadar yeni request gelmesin:
 *
 *   spec:
 *     containers:
 *     - name: backend
 *       lifecycle:
 *         preStop:
 *           exec:
 *             command: ["/bin/sh", "-c", "sleep 5"]
 *       terminationGracePeriodSeconds: 30
 *
 * Sentry instrumentation main.ts'te başlatıldığı için flush'tan önce başka
 * hook'ların log düşmesi yararlı; bu service onApplicationShutdown sırasında
 * ÖNCE çalışsın diye AppModule'ün providers listesinde EN ALT'a konur.
 */
@Injectable()
export class GracefulShutdownService implements OnApplicationShutdown {
  private readonly logger = new Logger('GracefulShutdown');

  // RedisCache DI ile inject edilir; provider yoksa @Optional null geçer
  // (test ortamı veya REDIS_DISABLED=1 senaryosu).
  constructor(@Optional() @Inject(RedisCache) private readonly cache?: RedisCache) {}

  async onApplicationShutdown(signal?: string): Promise<void> {
    const start = Date.now();
    this.logger.log(`Shutdown başlıyor (signal=${signal ?? 'unknown'})`);

    // Adım 1 — Prisma
    try {
      // basePrisma direct disconnect; $extends edilmiş `prisma` da aynı pool'u kullanır
      await Promise.race([
        basePrisma.$disconnect(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('prisma disconnect timeout')), 5000)),
      ]);
      this.logger.log('Prisma disconnect OK');
    } catch (err: any) {
      this.logger.warn(`Prisma disconnect başarısız: ${err.message}`);
    }

    // Adım 2 — Redis
    if (this.cache) {
      try {
        await Promise.race([
          this.cache.quit(),
          new Promise((_, rej) => setTimeout(() => rej(new Error('redis quit timeout')), 3000)),
        ]);
        this.logger.log('Redis quit OK');
      } catch (err: any) {
        this.logger.warn(`Redis quit başarısız: ${err.message}`);
      }
    }

    // Adım 3 — Sentry flush
    try {
      await Sentry.flush(2000);
      this.logger.log('Sentry flush OK');
    } catch (err: any) {
      this.logger.warn(`Sentry flush başarısız: ${err.message}`);
    }

    const duration = Date.now() - start;
    this.logger.log(`Shutdown tamamlandı (${duration}ms)`);
  }
}
