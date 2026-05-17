import { Worker, Job } from 'bullmq';
import { STATS_QUEUE } from './queue.constants';
import { prisma } from '../database/prisma';
import { processTestStatsRefresh } from './stats.processor';
import { getRedisConnectionOptions, validateRedisUrl } from '../../config/redis';

if (process.env.REDIS_DISABLED === '1' || process.env.REDIS_DISABLED === 'true') {
  // eslint-disable-next-line no-console
  console.log('[WORKER] Redis disabled; exiting.');
  process.exit(0);
}

validateRedisUrl();
const defaultConnection = getRedisConnectionOptions();

export function makeStatsJobHandler(prismaClient: any, processor: (prismaClient: any, testId: string) => Promise<any> = processTestStatsRefresh) {
  return async (job: Job) => {
    const testId = job.data?.testId;
    if (!testId) throw new Error('MISSING_TEST_ID');
    return processor(prismaClient, testId);
  };
}

export function createStatsWorker(opts: { connection?: any; prisma?: any; processor?: (prismaClient: any, testId: string) => Promise<any> }) {
  const connection = opts.connection ?? (defaultConnection as any);
  const handler = makeStatsJobHandler(opts.prisma ?? prisma, opts.processor);
  const worker = new Worker(STATS_QUEUE, handler as any, { connection, concurrency: 2 });
  worker.on('failed', (job, err) => {
    console.error('Stats job failed', job.id, err);
  });
  return worker;
}

// default bootstrap when run directly
if (require.main === module) {
  const worker = createStatsWorker({ prisma });
  process.on('SIGTERM', async () => {
    console.log('Stats worker shutting down');
    try {
      await worker.close();
      await prisma.$disconnect();
    } catch (e) {
      console.error('Error shutting down stats worker', e);
    }
    process.exit(0);
  });
  console.log('Stats worker started');
}

