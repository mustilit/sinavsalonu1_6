export {};
const { bootstrapTestApp, resetDb } = require('../helpers/test-app');

describe('Admin refunds approve/reject (FR-R-01 mikro-2)', () => {
  let app, prisma, httpServer, jwtService;
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

  test('admin approve pending refund -> 200 and status APPROVED', async () => {
    const request = require('supertest');
    const admin = await prisma.user.create({
      data: { email: 'admin-ref@example.com', username: 'adminref', passwordHash: 'x', role: 'ADMIN' },
    });
    const educator = await prisma.user.create({
      data: { email: 'ed-ref@example.com', username: 'edref', passwordHash: 'x', role: 'EDUCATOR' },
    });
    const candidate = await prisma.user.create({
      data: { email: 'c-ref@example.com', username: 'cref', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const test = await prisma.examTest.create({
      data: { title: 'Refund Test', educatorId: educator.id, status: 'PUBLISHED', publishedAt: new Date() },
    });
    const purchase = await prisma.purchase.create({
      data: { testId: test.id, candidateId: candidate.id, status: 'ACTIVE' },
    });
    const refund = await prisma.refundRequest.create({
      data: { purchaseId: purchase.id, candidateId: candidate.id, testId: test.id, status: 'PENDING' },
    });
    const adminToken = jwtService.sign({ sub: admin.id, email: admin.email, role: 'ADMIN' });

    const res = await request(httpServer)
      .post(`/admin/refunds/${refund.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('APPROVED');
    expect(res.body.id).toBe(refund.id);
    expect(res.body.decidedAt).toBeDefined();

    const updated = await prisma.refundRequest.findUnique({ where: { id: refund.id } });
    expect(updated?.status).toBe('APPROVED');
    expect(updated?.decidedBy).toBe(admin.id);
  }, 30000);

  test('admin reject pending refund -> 200 and status REJECTED', async () => {
    const request = require('supertest');
    const admin = await prisma.user.create({
      data: { email: 'admin-rej@example.com', username: 'adminrej', passwordHash: 'x', role: 'ADMIN' },
    });
    const educator = await prisma.user.create({
      data: { email: 'ed-rej@example.com', username: 'edrej', passwordHash: 'x', role: 'EDUCATOR' },
    });
    const candidate = await prisma.user.create({
      data: { email: 'c-rej@example.com', username: 'crej', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const test = await prisma.examTest.create({
      data: { title: 'Refund Rej', educatorId: educator.id, status: 'PUBLISHED', publishedAt: new Date() },
    });
    const purchase = await prisma.purchase.create({
      data: { testId: test.id, candidateId: candidate.id, status: 'ACTIVE' },
    });
    const refund = await prisma.refundRequest.create({
      data: { purchaseId: purchase.id, candidateId: candidate.id, testId: test.id, status: 'PENDING' },
    });
    const adminToken = jwtService.sign({ sub: admin.id, email: admin.email, role: 'ADMIN' });

    const res = await request(httpServer)
      .post(`/admin/refunds/${refund.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Not eligible for refund.' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('REJECTED');
    expect(res.body.id).toBe(refund.id);
    expect(res.body.decidedAt).toBeDefined();

    const updated = await prisma.refundRequest.findUnique({ where: { id: refund.id } });
    expect(updated?.status).toBe('REJECTED');
    expect(updated?.decidedBy).toBe(admin.id);
  }, 30000);

  test('candidate calls approve -> 403', async () => {
    const request = require('supertest');
    const educator = await prisma.user.create({
      data: { email: 'ed-cand@example.com', username: 'edcand', passwordHash: 'x', role: 'EDUCATOR' },
    });
    const candidate = await prisma.user.create({
      data: { email: 'c-cand@example.com', username: 'ccand', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const test = await prisma.examTest.create({
      data: { title: 'Refund Cand', educatorId: educator.id, status: 'PUBLISHED', publishedAt: new Date() },
    });
    const purchase = await prisma.purchase.create({
      data: { testId: test.id, candidateId: candidate.id, status: 'ACTIVE' },
    });
    const refund = await prisma.refundRequest.create({
      data: { purchaseId: purchase.id, candidateId: candidate.id, testId: test.id, status: 'PENDING' },
    });
    const candidateToken = jwtService.sign({ sub: candidate.id, email: candidate.email, role: 'CANDIDATE' });

    const approveRes = await request(httpServer)
      .post(`/admin/refunds/${refund.id}/approve`)
      .set('Authorization', `Bearer ${candidateToken}`);
    expect(approveRes.status).toBe(403);

    const rejectRes = await request(httpServer)
      .post(`/admin/refunds/${refund.id}/reject`)
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({ reason: 'Some reason here.' });
    expect(rejectRes.status).toBe(403);
  }, 30000);

  test('admin approve already decided refund -> 409 REFUND_ALREADY_DECIDED', async () => {
    const request = require('supertest');
    const admin = await prisma.user.create({
      data: { email: 'admin-dec@example.com', username: 'admindec', passwordHash: 'x', role: 'ADMIN' },
    });
    const educator = await prisma.user.create({
      data: { email: 'ed-dec@example.com', username: 'eddec', passwordHash: 'x', role: 'EDUCATOR' },
    });
    const candidate = await prisma.user.create({
      data: { email: 'c-dec@example.com', username: 'cdec', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const test = await prisma.examTest.create({
      data: { title: 'Refund Dec', educatorId: educator.id, status: 'PUBLISHED', publishedAt: new Date() },
    });
    const purchase = await prisma.purchase.create({
      data: { testId: test.id, candidateId: candidate.id, status: 'ACTIVE' },
    });
    const refund = await prisma.refundRequest.create({
      data: {
        purchaseId: purchase.id,
        candidateId: candidate.id,
        testId: test.id,
        status: 'APPROVED',
        decidedBy: admin.id,
        decidedAt: new Date(),
      },
    });
    const adminToken = jwtService.sign({ sub: admin.id, email: admin.email, role: 'ADMIN' });

    const res = await request(httpServer)
      .post(`/admin/refunds/${refund.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(409);
    expect(res.body?.error?.code).toBe('REFUND_ALREADY_DECIDED');
  }, 30000);

  test('admin reject already decided refund -> 409 REFUND_ALREADY_DECIDED', async () => {
    const request = require('supertest');
    const admin = await prisma.user.create({
      data: { email: 'admin-rejdec@example.com', username: 'adminrejdec', passwordHash: 'x', role: 'ADMIN' },
    });
    const educator = await prisma.user.create({
      data: { email: 'ed-rejdec@example.com', username: 'edrejdec', passwordHash: 'x', role: 'EDUCATOR' },
    });
    const candidate = await prisma.user.create({
      data: { email: 'c-rejdec@example.com', username: 'crejdec', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const test = await prisma.examTest.create({
      data: { title: 'Refund RejDec', educatorId: educator.id, status: 'PUBLISHED', publishedAt: new Date() },
    });
    const purchase = await prisma.purchase.create({
      data: { testId: test.id, candidateId: candidate.id, status: 'ACTIVE' },
    });
    const refund = await prisma.refundRequest.create({
      data: {
        purchaseId: purchase.id,
        candidateId: candidate.id,
        testId: test.id,
        status: 'REJECTED',
        decidedBy: admin.id,
        decidedAt: new Date(),
      },
    });
    const adminToken = jwtService.sign({ sub: admin.id, email: admin.email, role: 'ADMIN' });

    const res = await request(httpServer)
      .post(`/admin/refunds/${refund.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Another rejection reason.' });
    expect(res.status).toBe(409);
    expect(res.body?.error?.code).toBe('REFUND_ALREADY_DECIDED');
  }, 30000);

  test('admin approve non-existent refund -> 404 REFUND_NOT_FOUND', async () => {
    const request = require('supertest');
    const admin = await prisma.user.create({
      data: { email: 'admin-404@example.com', username: 'admin404', passwordHash: 'x', role: 'ADMIN' },
    });
    const adminToken = jwtService.sign({ sub: admin.id, email: admin.email, role: 'ADMIN' });
    const fakeId = '00000000-0000-0000-0000-000000000001';

    const res = await request(httpServer)
      .post(`/admin/refunds/${fakeId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe('REFUND_NOT_FOUND');
  }, 30000);
});
