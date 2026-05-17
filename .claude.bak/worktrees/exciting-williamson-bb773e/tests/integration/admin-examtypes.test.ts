import request from 'supertest';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../apps/backend/src/nest/app.module';
import { prisma } from '../../apps/backend/src/infrastructure/database/prisma';

describe('Admin ExamTypes', () => {
  let app;
  beforeAll(async () => {
    app = await NestFactory.create(AppModule);
    await app.init();
  });
  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('admin can create and list exam types', async () => {
    // This test assumes you have a helper to obtain admin token; skip if not configured.
    const adminToken = process.env.TEST_ADMIN_TOKEN || '';
    const res = await request((app as any).getHttpServer())
      .post('/admin/exam-types')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Matematik' });
    expect([201, 200]).toContain(res.status);
    const list = await request((app as any).getHttpServer()).get('/admin/exam-types').set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);
    const found = list.body.find((t: any) => t.name === 'Matematik');
    expect(found).toBeTruthy();
  }, 20000);
});

