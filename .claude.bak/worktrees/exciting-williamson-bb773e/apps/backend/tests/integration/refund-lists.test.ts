export {};
const { bootstrapTestApp, resetDb } = require('../helpers/test-app');

describe('Refund lists (FR-R-01 mikro-3)', () => {
  let app: any, prisma: any, httpServer: any, jwtService: any;
  beforeAll(async () => {
    const boot = await bootstrapTestApp();
    app = boot.app;
    prisma = boot.prisma;
    httpServer = boot.httpServer;
    jwtService = boot.jwtService;
  }, 30000);

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDb(prisma);
  });

  test('candidate sees own refunds -> 200', async () => {
    const request = require('supertest');
    const educator = await prisma.user.create({
      data: { email: 'ed-list@example.com', username: 'edlist', passwordHash: 'x', role: 'EDUCATOR' },
    });
    const candidate = await prisma.user.create({
      data: { email: 'c-list@example.com', username: 'clist', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const test = await prisma.examTest.create({
      data: { title: 'My Test', educatorId: educator.id, status: 'PUBLISHED', publishedAt: new Date() },
    });
    const purchase = await prisma.purchase.create({
      data: { testId: test.id, candidateId: candidate.id, status: 'ACTIVE' },
    });
    await prisma.refundRequest.create({
      data: { purchaseId: purchase.id, candidateId: candidate.id, testId: test.id, status: 'PENDING' },
    });
    const token = jwtService.sign({ sub: candidate.id, email: candidate.email, role: 'CANDIDATE' });

    const res = await request(httpServer)
      .get('/me/refunds')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].candidateId).toBe(candidate.id);
    expect(res.body[0].status).toBe('PENDING');
    expect(res.body[0].testTitle).toBe('My Test');
  }, 30000);

  test('candidate does not see other candidate refunds', async () => {
    const request = require('supertest');
    const educator = await prisma.user.create({
      data: { email: 'ed-other@example.com', username: 'edother', passwordHash: 'x', role: 'EDUCATOR' },
    });
    const candidateA = await prisma.user.create({
      data: { email: 'ca@example.com', username: 'ca', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const candidateB = await prisma.user.create({
      data: { email: 'cb@example.com', username: 'cb', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const test = await prisma.examTest.create({
      data: { title: 'A Test', educatorId: educator.id, status: 'PUBLISHED', publishedAt: new Date() },
    });
    const purchaseA = await prisma.purchase.create({
      data: { testId: test.id, candidateId: candidateA.id, status: 'ACTIVE' },
    });
    await prisma.refundRequest.create({
      data: { purchaseId: purchaseA.id, candidateId: candidateA.id, testId: test.id, status: 'PENDING' },
    });
    const tokenB = jwtService.sign({ sub: candidateB.id, email: candidateB.email, role: 'CANDIDATE' });

    const res = await request(httpServer)
      .get('/me/refunds')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  }, 30000);

  test('admin pending list -> only PENDING returned', async () => {
    const request = require('supertest');
    const admin = await prisma.user.create({
      data: { email: 'admin-list@example.com', username: 'adminlist', passwordHash: 'x', role: 'ADMIN' },
    });
    const educator = await prisma.user.create({
      data: { email: 'ed-pend@example.com', username: 'edpend', passwordHash: 'x', role: 'EDUCATOR' },
    });
    const candidate = await prisma.user.create({
      data: { email: 'c-pend@example.com', username: 'cpend', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const test1 = await prisma.examTest.create({
      data: { title: 'Pending Test', educatorId: educator.id, status: 'PUBLISHED', publishedAt: new Date() },
    });
    const test2 = await prisma.examTest.create({
      data: { title: 'Approved Test', educatorId: educator.id, status: 'PUBLISHED', publishedAt: new Date() },
    });
    const purchase1 = await prisma.purchase.create({
      data: { testId: test1.id, candidateId: candidate.id, status: 'ACTIVE' },
    });
    const purchase2 = await prisma.purchase.create({
      data: { testId: test2.id, candidateId: candidate.id, status: 'ACTIVE' },
    });
    await prisma.refundRequest.create({
      data: { purchaseId: purchase1.id, candidateId: candidate.id, testId: test1.id, status: 'PENDING' },
    });
    await prisma.refundRequest.create({
      data: {
        purchaseId: purchase2.id,
        candidateId: candidate.id,
        testId: test2.id,
        status: 'APPROVED',
        decidedBy: admin.id,
        decidedAt: new Date(),
      },
    });
    const adminToken = jwtService.sign({ sub: admin.id, email: admin.email, role: 'ADMIN' });

    const res = await request(httpServer)
      .get('/admin/refunds')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const allPending = res.body.every((r: any) => r.status === 'PENDING');
    expect(allPending).toBe(true);
    expect(res.body.some((r: any) => r.testTitle === 'Pending Test')).toBe(true);
  }, 30000);

  test('candidate to admin refunds endpoint -> 403', async () => {
    const request = require('supertest');
    const candidate = await prisma.user.create({
      data: { email: 'c-forbid@example.com', username: 'cforbid', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const token = jwtService.sign({ sub: candidate.id, email: candidate.email, role: 'CANDIDATE' });

    const res = await request(httpServer)
      .get('/admin/refunds')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  }, 30000);
});
