// DATABASE_URL'in PrismaClient oluşturulmadan önce yüklü olduğunu garantile.
// tsx (esbuild) statik importları hoist eder — index.ts'deki dotenv yüklemesi
// bu modülün import edilmesinden SONRA çalışır.
import { config as dotenvConfig } from 'dotenv';
import { resolve as pathResolve } from 'path';

// Kesin yol ile .env yükle (tsx watch modunda __dirname güvenilir)
dotenvConfig({ path: pathResolve(__dirname, '../../../.env') });

import { PrismaClient } from '@prisma/client';
import { tenantExtension } from './tenantExtension';

const globalForPrisma = globalThis as unknown as {
  prisma: any;
};

let lastReconnectAttemptAt = 0;
let reconnectInFlight: Promise<void> | null = null;

function shouldAttemptReconnect(now = Date.now()) {
  return now - lastReconnectAttemptAt > 5000;
}

// DATABASE_URL doğrudan datasource override olarak verilir;
// bu sayede env okuma zamanlaması sorunları ortadan kalkar.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error(
    '[prisma] DATABASE_URL bulunamadı. Lütfen .env dosyasını kontrol edin.',
    'Aranan yol:',
    pathResolve(__dirname, '../../../.env'),
  );
}

const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
    ...(databaseUrl && {
      datasources: { db: { url: databaseUrl } },
    }),
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma;

export const prisma = basePrisma.$extends(tenantExtension) as unknown as PrismaClient;

/**
 * Read-only replica client (KALITE-DEGERLENDIRME §4 — read replica).
 * DATABASE_REPLICA_URL tanımlı değilse primary'i kullanır (fallback).
 *
 * Yalnızca raporlama/analytics use case'lerinde tercih edilir.
 * Read-after-write garantisi gerektiren akışlarda primary kullan.
 */
const replicaUrl = process.env.DATABASE_REPLICA_URL?.trim();

export const prismaReplica: typeof prisma = replicaUrl
  ? (new PrismaClient({
      datasources: { db: { url: replicaUrl } },
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    }).$extends(tenantExtension) as unknown as PrismaClient)
  : prisma;

export const isReplicaEnabled = (): boolean => !!replicaUrl;

// $on/$disconnect/$connect ham PrismaClient üzerinde tanımlıdır.
// $extends ile elde edilen istemcide event handler register edemiyoruz.
(basePrisma as any).$on('error', async (e: any) => {
  // eslint-disable-next-line no-console
  console.error('Prisma connection error', e);

  const now = Date.now();
  if (!shouldAttemptReconnect(now)) return;
  if (reconnectInFlight) return;

  lastReconnectAttemptAt = now;
  reconnectInFlight = (async () => {
    try {
      await basePrisma.$disconnect();
    } catch {
      // ignore disconnect errors
    }
    try {
      await basePrisma.$connect();
      // eslint-disable-next-line no-console
      console.log('Prisma reconnect succeeded');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Prisma reconnect failed', err);
    } finally {
      reconnectInFlight = null;
    }
  })();

  await reconnectInFlight;
});
