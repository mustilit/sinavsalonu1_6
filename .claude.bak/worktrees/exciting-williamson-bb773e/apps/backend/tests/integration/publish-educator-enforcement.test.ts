export {};
const { bootstrapTestApp, resetDb } = require('../helpers/test-app');

describe('Publish educator enforcement (FR-Y-02 mikro-2)', () => {
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

  test('onaysız educator publish -> 403 EDUCATOR_NOT_APPROVED', async () => {
    const request = require('supertest');
    const educator = await prisma.user.create({
      data: {
        email: 'edu-unapproved@example.com',
        username: 'eduunapp',
        passwordHash: 'x',
        role: 'EDUCATOR',
        status: 'ACTIVE',
        educatorApprovedAt: null,
      },
    });
    const examType = await prisma.examType.create({
      data: { name: 'KPSS', slug: 'kpss-pub-' + Date.now(), active: true },
    });
    const token = jwtService.sign({ sub: educator.id, email: educator.email, role: 'EDUCATOR' });
    const createRes = await request(httpServer)
      .post('/tests')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Draft Test', examTypeId: examType.id });
    expect(createRes.status).toBe(201);
    const testId = createRes.body.id;
    // Add 5 questions so taxonomy is satisfied (examTypeId already set)
    for (let i = 0; i < 5; i++) {
      await request(httpServer)
        .post(`/tests/${testId}/questions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: `Q${i + 1}`, order: i + 1, options: [{ content: 'A', isCorrect: true }, { content: 'B', isCorrect: false }] });
    }
    const publishRes = await request(httpServer)
      .put(`/tests/${testId}/publish`)
      .set('Authorization', `Bearer ${token}`);
    expect(publishRes.status).toBe(403);
    expect(publishRes.body?.error?.code).toBe('EDUCATOR_NOT_APPROVED');
  }, 30000);

  test('suspended educator publish -> 403 EDUCATOR_SUSPENDED', async () => {
    const request = require('supertest');
    const educator = await prisma.user.create({
      data: {
        email: 'edu-suspended@example.com',
        username: 'edususpended',
        passwordHash: 'x',
        role: 'EDUCATOR',
        status: 'SUSPENDED',
        educatorApprovedAt: new Date(),
      },
    });
    const examType = await prisma.examType.create({
      data: { name: 'KPSS', slug: 'kpss-sus-' + Date.now(), active: true },
    });
    const token = jwtService.sign({ sub: educator.id, email: educator.email, role: 'EDUCATOR' });
    const createRes = await request(httpServer)
      .post('/tests')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Draft Test 2', examTypeId: examType.id });
    expect(createRes.status).toBe(201);
    const testId = createRes.body.id;
    for (let i = 0; i < 5; i++) {
      await request(httpServer)
        .post(`/tests/${testId}/questions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: `Q${i + 1}`, order: i + 1, options: [{ content: 'A', isCorrect: true }, { content: 'B', isCorrect: false }] });
    }
    const publishRes = await request(httpServer)
      .put(`/tests/${testId}/publish`)
      .set('Authorization', `Bearer ${token}`);
    expect(publishRes.status).toBe(403);
    expect(publishRes.body?.error?.code).toBe('EDUCATOR_SUSPENDED');
  }, 30000);

  test('onaylı + active educator publish -> 200', async () => {
    const request = require('supertest');
    const educator = await prisma.user.create({
      data: {
        email: 'edu-approved@example.com',
        username: 'eduapproved',
        passwordHash: 'x',
        role: 'EDUCATOR',
        status: 'ACTIVE',
        educatorApprovedAt: new Date(),
      },
    });
    const examType = await prisma.examType.create({
      data: { name: 'KPSS', slug: 'kpss-ok-' + Date.now(), active: true },
    });
    const token = jwtService.sign({ sub: educator.id, email: educator.email, role: 'EDUCATOR' });
    const createRes = await request(httpServer)
      .post('/tests')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Ready Test', examTypeId: examType.id });
    expect(createRes.status).toBe(201);
    const testId = createRes.body.id;
    for (let i = 0; i < 5; i++) {
      await request(httpServer)
        .post(`/tests/${testId}/questions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: `Q${i + 1}`, order: i + 1, options: [{ content: 'A', isCorrect: true }, { content: 'B', isCorrect: false }] });
    }
    const publishRes = await request(httpServer)
      .put(`/tests/${testId}/publish`)
      .set('Authorization', `Bearer ${token}`);
    expect(publishRes.status).toBe(200);
    const row = await prisma.examTest.findUnique({ where: { id: testId } });
    expect(row?.status).toBe('PUBLISHED');
    expect(row?.publishedAt).toBeDefined();
  }, 30000);
});
