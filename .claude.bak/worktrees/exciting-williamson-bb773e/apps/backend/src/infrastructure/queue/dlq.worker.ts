import { Worker, Job } from 'bullmq';
import { EMAIL_DLQ } from './queue.constants';
import { prisma } from '../database/prisma';
import { SlackNotifier } from '../services/SlackNotifier';
import { getRedisConnectionOptions, validateRedisUrl } from '../../config/redis';

if (process.env.REDIS_DISABLED === '1' || process.env.REDIS_DISABLED === 'true') {
  // eslint-disable-next-line no-console
  console.log('[WORKER] Redis disabled; exiting.');
  process.exit(0);
}

validateRedisUrl();

const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;
const connection = getRedisConnectionOptions();

const notifier = new SlackNotifier(SLACK_WEBHOOK);

const worker = new Worker(
  EMAIL_DLQ,
  async (job: Job) => {
    const data = job.data as any;
    console.error('DLQ item received', data);
    await prisma.auditLog.create({
      data: {
        action: 'EMAIL_FAILED' as any,
        entityType: 'EmailDLQ',
        entityId: job.id as any,
        actorId: null,
        metadata: { ...data },
      },
    });
    if (SLACK_WEBHOOK) {
      await notifier.notify(`DLQ email failed: ${JSON.stringify(data)}`);
    }
  },
  { connection: connection as any, concurrency: 1 }
);

process.on('SIGTERM', async () => {
  console.log('DLQ worker SIGTERM, shutting down...');
  try {
    await worker.close();
    await prisma.$disconnect();
  } catch (e) {
    console.error('Error shutting down DLQ worker', e);
  }
  process.exit(0);
});

process.on('unhandledRejection', (err) => {
  console.error('DLQ worker unhandledRejection', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('DLQ worker uncaughtException', err);
  process.exit(1);
});

console.log('DLQ worker started, queue=', EMAIL_DLQ);

