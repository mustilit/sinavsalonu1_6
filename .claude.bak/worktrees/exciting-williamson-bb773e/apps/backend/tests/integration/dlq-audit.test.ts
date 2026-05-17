export {};
const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const { bootstrapTestApp } = require('../helpers/test-app');

let app, httpServer, prisma, jwtService;

describe('DLQ admin audit endpoint', () => {
  let adminToken;
  beforeAll(async () => {
    const boot = await bootstrapTestApp();
    app = boot.app;
    httpServer = boot.httpServer;
    prisma = boot.prisma;
    jwtService = boot.jwtService;
  }, 30000);

  beforeEach(async () => {
    const { resetDb } = require('../helpers/test-app');
    await resetDb(prisma);
    await prisma.user.deleteMany({ where: { email: 'admin@example.com' } }).catch(() => {});
    const admin = await prisma.user.create({ data: { email: 'admin@example.com', username: 'admin', passwordHash: 'x', role: 'ADMIN' } });
    adminToken = jwtService.sign({ sub: admin.id, email: admin.email, role: 'ADMIN' });
    await prisma.auditLog.create({
      data: {
        action: 'EMAIL_FAILED',
        entityType: 'EmailDLQ',
        entityId: 'dlq-test',
        actorId: null,
        metadata: { to: 'u@example.com', failedReason: 'test' },
      },
    });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('returns DLQ items for admin', async () => {
    const res = await request(httpServer).get('/admin/dlq/emails?limit=10').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.items[0]).toHaveProperty('metadata');
  });

  it('forbids non-admin', async () => {
    await prisma.user.deleteMany({ where: { email: 'cand2@example.com' } }).catch(()=>{});
    const cand = await prisma.user.create({ data: { email: 'cand2@example.com', username: 'cand2', passwordHash: 'x', role: 'CANDIDATE' } });
    const candToken = jwtService.sign({ sub: cand.id, email: cand.email, role: 'CANDIDATE' });
    const res = await request(httpServer).get('/admin/dlq/emails?limit=10').set('Authorization', `Bearer ${candToken}`);
    expect(res.status).toBe(403);
  });
});

