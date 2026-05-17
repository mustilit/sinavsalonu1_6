import { Worker, Job, Queue } from 'bullmq';
import { EMAIL_QUEUE, EMAIL_DLQ } from './queue.constants';
import { EmailJob } from './queue.types';
import { MockEmailProvider } from '../services/MockEmailProvider';
import { prisma } from '../database/prisma';
import http from 'http';
import { getRedisConnectionOptions, validateRedisUrl } from '../../config/redis';

if (process.env.REDIS_DISABLED === '1' || process.env.REDIS_DISABLED === 'true') {
  // eslint-disable-next-line no-console
  console.log('[WORKER] Redis disabled; exiting.');
  process.exit(0);
}

validateRedisUrl();

const WORKER_PORT = parseInt(process.env.WORKER_PORT || '3010', 10);
const connection = getRedisConnectionOptions();

const dlq = new Queue(EMAIL_DLQ, { connection: connection as any });

let worker: Worker;

function startWorker() {
  worker = new Worker(
    EMAIL_QUEUE,
    async (job: Job<EmailJob>) => {
      const provider = new MockEmailProvider();
      await provider.sendEmail(job.data.to, job.data.subject, job.data.body);
      await prisma.auditLog.create({
        data: {
          action: 'EMAIL_SENT' as any,
          entityType: 'Email',
          entityId: job.id as any,
          actorId: null,
          metadata: { to: job.data.to, meta: job.data.meta ?? null },
        },
      });
    },
    {
      connection: connection as any,
      concurrency: 5,
      limiter: { max: 20, duration: 1000 },
    }
  );

  worker.on('failed', async (job, err) => {
    console.error('Email job failed', job.id, err);
    try {
      // if attempts exhausted, push to DLQ
      const attempts = (job.opts && (job.opts as any).attempts) || 1;
      if ((job.attemptsMade ?? 0) >= attempts) {
        await dlq.add('dlq', { originalJob: job.data, originalJobId: job.id, failedReason: err?.message ?? String(err), timestamp: new Date().toISOString() } as any);
      }
    } catch (e) {
      console.error('Failed to push to DLQ', e);
    }
  });

  console.log('Email worker started, queue=', EMAIL_QUEUE);
}

let server: http.Server | null = null;

async function startHealthServer() {
  const queue = new Queue(EMAIL_QUEUE, { connection: connection as any });
  server = http.createServer(async (req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, queue: EMAIL_QUEUE }));
      return;
    }
    if (req.url === '/metrics') {
      try {
        const counts = await queue.getJobCounts('waiting', 'active', 'failed', 'completed');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(counts));
      } catch (e) {
        res.writeHead(500);
        res.end('error');
      }
      return;
    }
    res.writeHead(404);
    res.end('not found');
  });
  server.listen(WORKER_PORT, () => console.log(`Worker health server listening on ${WORKER_PORT}`));
}

startWorker();
startHealthServer();

process.on('SIGTERM', async () => {
  console.log('SIGTERM received: shutting down worker...');
  try {
    if (worker) await worker.close();
    await dlq.close();
    if (server) {
      server.close();
    }
    await prisma.$disconnect();
  } catch (e) {
    console.error('Error during shutdown', e);
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received: shutting down worker...');
  try {
    if (worker) await worker.close();
    await dlq.close();
    if (server) {
      server.close();
    }
    await prisma.$disconnect();
  } catch (e) {
    console.error('Error during shutdown', e);
  }
  process.exit(0);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection in worker', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception in worker', err);
  process.exit(1);
});


