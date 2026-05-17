export {};
const { bootstrapTestApp, resetDb } = require('../helpers/test-app');

describe('Refund request (FR-R-01 mikro-1)', () => {
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

  test('candidate own purchase -> 201', async () => {
    const request = require('supertest');
    const educator = await prisma.user.create({
      data: { email: 'ed-r@example.com', username: 'edr', passwordHash: 'x', role: 'EDUCATOR' },
    });
    const candidate = await prisma.user.create({
      data: { email: 'c-r@example.com', username: 'cr', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const test = await prisma.examTest.create({
      data: {
        title: 'Refund Test',
        educatorId: educator.id,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    const purchase = await prisma.purchase.create({
      data: { testId: test.id, candidateId: candidate.id, status: 'ACTIVE' },
    });
    const token = jwtService.sign({ sub: candidate.id, email: candidate.email, role: 'CANDIDATE' });

    const res = await request(httpServer)
      .post('/refunds')
      .set('Authorization', `Bearer ${token}`)
      .send({ purchaseId: purchase.id, reason: 'Changed my mind about this test.' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.purchaseId).toBe(purchase.id);
    expect(res.body.candidateId).toBe(candidate.id);
    expect(res.body.status).toBe('PENDING');
  }, 30000);

  test('candidate other purchase -> 403 FORBIDDEN_NOT_OWNER', async () => {
    const request = require('supertest');
    const educator = await prisma.user.create({
      data: { email: 'ed-r2@example.com', username: 'edr2', passwordHash: 'x', role: 'EDUCATOR' },
    });
    const candidate1 = await prisma.user.create({
      data: { email: 'c1-r@example.com', username: 'c1r', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const candidate2 = await prisma.user.create({
      data: { email: 'c2-r@example.com', username: 'c2r', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const test = await prisma.examTest.create({
      data: {
        title: 'Refund Test 2',
        educatorId: educator.id,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    const purchase = await prisma.purchase.create({
      data: { testId: test.id, candidateId: candidate1.id, status: 'ACTIVE' },
    });
    const token2 = jwtService.sign({ sub: candidate2.id, email: candidate2.email, role: 'CANDIDATE' });

    const res = await request(httpServer)
      .post('/refunds')
      .set('Authorization', `Bearer ${token2}`)
      .send({ purchaseId: purchase.id, reason: 'I want to refund someone else purchase.' });
    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe('FORBIDDEN_NOT_OWNER');
  }, 30000);

  test('duplicate refund request -> 409 REFUND_ALREADY_REQUESTED', async () => {
    const request = require('supertest');
    const educator = await prisma.user.create({
      data: { email: 'ed-r3@example.com', username: 'edr3', passwordHash: 'x', role: 'EDUCATOR' },
    });
    const candidate = await prisma.user.create({
      data: { email: 'c3-r@example.com', username: 'c3r', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const test = await prisma.examTest.create({
      data: {
        title: 'Refund Test 3',
        educatorId: educator.id,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    const purchase = await prisma.purchase.create({
      data: { testId: test.id, candidateId: candidate.id, status: 'ACTIVE' },
    });
    await prisma.refundRequest.create({
      data: { purchaseId: purchase.id, candidateId: candidate.id, testId: test.id, status: 'PENDING' },
    });
    const token = jwtService.sign({ sub: candidate.id, email: candidate.email, role: 'CANDIDATE' });

    const res = await request(httpServer)
      .post('/refunds')
      .set('Authorization', `Bearer ${token}`)
      .send({ purchaseId: purchase.id, reason: 'Second request for same purchase.' });
    expect(res.status).toBe(409);
    expect(res.body?.error?.code).toBe('REFUND_ALREADY_REQUESTED');
  }, 30000);

  test('purchase older than 7 days -> 409 REFUND_WINDOW_EXPIRED', async () => {
    const request = require('supertest');
    const educator = await prisma.user.create({
      data: { email: 'ed-r4@example.com', username: 'edr4', passwordHash: 'x', role: 'EDUCATOR' },
    });
    const candidate = await prisma.user.create({
      data: { email: 'c4-r@example.com', username: 'c4r', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const test = await prisma.examTest.create({
      data: {
        title: 'Refund Test 4',
        educatorId: educator.id,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const purchase = await prisma.purchase.create({
      data: { testId: test.id, candidateId: candidate.id, status: 'ACTIVE', createdAt: eightDaysAgo },
    });
    const token = jwtService.sign({ sub: candidate.id, email: candidate.email, role: 'CANDIDATE' });

    const res = await request(httpServer)
      .post('/refunds')
      .set('Authorization', `Bearer ${token}`)
      .send({ purchaseId: purchase.id, reason: 'Requesting refund after 7 days.' });
    expect(res.status).toBe(409);
    expect(res.body?.error?.code).toBe('REFUND_WINDOW_EXPIRED');
  }, 30000);

  test('attempt started for test -> 409 REFUND_NOT_ALLOWED_ATTEMPT_STARTED', async () => {
    const request = require('supertest');
    const educator = await prisma.user.create({
      data: { email: 'ed-r5@example.com', username: 'edr5', passwordHash: 'x', role: 'EDUCATOR' },
    });
    const candidate = await prisma.user.create({
      data: { email: 'c5-r@example.com', username: 'c5r', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const test = await prisma.examTest.create({
      data: {
        title: 'Refund Test 5',
        educatorId: educator.id,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    const purchase = await prisma.purchase.create({
      data: { testId: test.id, candidateId: candidate.id, status: 'ACTIVE' },
    });
    await prisma.testAttempt.create({
      data: { testId: test.id, candidateId: candidate.id, status: 'IN_PROGRESS' },
    });
    const token = jwtService.sign({ sub: candidate.id, email: candidate.email, role: 'CANDIDATE' });

    const res = await request(httpServer)
      .post('/refunds')
      .set('Authorization', `Bearer ${token}`)
      .send({ purchaseId: purchase.id, reason: 'Started attempt then want refund.' });
    expect(res.status).toBe(409);
    expect(res.body?.error?.code).toBe('REFUND_NOT_ALLOWED_ATTEMPT_STARTED');
  }, 30000);
});
