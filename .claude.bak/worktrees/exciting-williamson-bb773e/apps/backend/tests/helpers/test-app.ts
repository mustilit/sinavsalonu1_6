import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/nest/app.module';
import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { JwtService } from '../../src/infrastructure/services/JwtService';

export async function bootstrapTestApp(): Promise<{ app: INestApplication; httpServer: any; prisma: PrismaClient; jwtService: JwtService }> {
  process.env.NODE_ENV = 'test';
  process.env.REDIS_DISABLED = '1';
  process.env.CRON_DISABLED = '1';
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    providers: [JwtService],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  const httpServer = app.getHttpServer();
  const prisma = new PrismaClient();
  const jwtService = moduleRef.get(JwtService);
  return { app, httpServer, prisma, jwtService };
}

export async function resetDb(prisma: PrismaClient) {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('resetDb can only be run in test environment');
  }
  // Use actual mapped table names from Prisma schema
  const sql = `
    TRUNCATE
      "attempt_answers",
      "test_attempts",
      "refund_requests",
      "purchases",
      "objections",
      "reviews",
      "test_stats",
      "exam_options",
      "exam_questions",
      "exam_tests",
      "topics",
      "exam_types",
      "follows",
      "notification_preferences",
      "audit_logs",
      "contract_acceptances",
      "contracts",
      "discount_codes",
      "user_preferences",
      "users",
      "admin_settings"
    RESTART IDENTITY CASCADE;
  `;
  await prisma.$executeRawUnsafe(sql);
}

export async function resetRedis() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('resetRedis can only be run in test environment');
  }
  const url = process.env.REDIS_URL || process.env.REDIS || null;
  if (!url) return;
  const IORedis = require('ioredis');
  const client = new IORedis(url);
  try {
    await client.flushdb();
  } finally {
    await client.quit();
  }
}

