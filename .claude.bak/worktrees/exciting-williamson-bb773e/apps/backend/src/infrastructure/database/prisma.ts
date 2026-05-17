import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
};

let lastReconnectAttemptAt = 0;
let reconnectInFlight: Promise<void> | null = null;

function shouldAttemptReconnect(now = Date.now()) {
  // 5 saniyede bir dene
  return now - lastReconnectAttemptAt > 5000;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

(prisma as any).$on('error', async (e: any) => {
  // eslint-disable-next-line no-console
  console.error('Prisma connection error', e);

  const now = Date.now();
  if (!shouldAttemptReconnect(now)) return;
  if (reconnectInFlight) return;

  lastReconnectAttemptAt = now;
  reconnectInFlight = (async () => {
    try {
      await prisma.$disconnect();
    } catch {
      // ignore disconnect errors
    }
    try {
      await prisma.$connect();
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


