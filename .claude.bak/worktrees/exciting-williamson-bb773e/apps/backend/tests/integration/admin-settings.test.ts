export {};
const { bootstrapTestApp, resetDb } = require('../helpers/test-app');

describe('Admin settings (FR-Y-06)', () => {
  let app: any, prisma: any, httpServer: any, jwtService: any;

  beforeAll(async () => {
    const boot = await bootstrapTestApp();
    app = boot.app;
    prisma = boot.prisma;
    httpServer = boot.httpServer;
    jwtService = boot.jwtService;
  }, 30000);

  afterAll(async () => {
    if (app) await app.close();
    if (prisma) await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDb(prisma);
    await prisma.adminSettings.upsert({
      where: { id: 1 },
      create: { id: 1, commissionPercent: 20, vatPercent: 18, purchasesEnabled: true },
      update: { commissionPercent: 20, vatPercent: 18, purchasesEnabled: true },
    });
  });

  test('GET /admin/settings returns settings', async () => {
    const request = require('supertest');
    const admin = await prisma.user.create({
      data: { email: 'admin-s@example.com', username: 'admins', passwordHash: 'x', role: 'ADMIN' },
    });
    const token = jwtService.sign({ sub: admin.id, email: admin.email, role: 'ADMIN' });

    const res = await request(httpServer)
      .get('/admin/settings')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.commissionPercent).toBe(20);
    expect(res.body.vatPercent).toBe(18);
    expect(res.body.purchasesEnabled).toBe(true);
  }, 30000);

  test('PATCH /admin/settings updates commission and vat', async () => {
    const request = require('supertest');
    const admin = await prisma.user.create({
      data: { email: 'admin-s2@example.com', username: 'admins2', passwordHash: 'x', role: 'ADMIN' },
    });
    const token = jwtService.sign({ sub: admin.id, email: admin.email, role: 'ADMIN' });

    const patch = await request(httpServer)
      .patch('/admin/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ commissionPercent: 25, vatPercent: 20 });
    expect(patch.status).toBe(200);

    const get = await request(httpServer)
      .get('/admin/settings')
      .set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(200);
    expect(get.body.commissionPercent).toBe(25);
    expect(get.body.vatPercent).toBe(20);
  }, 30000);

  test('candidate GET /admin/settings -> 403', async () => {
    const request = require('supertest');
    const candidate = await prisma.user.create({
      data: { email: 'cand-s@example.com', username: 'cands', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const token = jwtService.sign({ sub: candidate.id, email: candidate.email, role: 'CANDIDATE' });

    const res = await request(httpServer)
      .get('/admin/settings')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  }, 30000);
});
