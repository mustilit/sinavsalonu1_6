export {};
const { bootstrapTestApp, resetDb } = require('../helpers/test-app');

describe('Purchases disabled (FR-Y-05)', () => {
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
  });

  test('POST /purchases/:testId when purchasesEnabled=false -> 400 PURCHASES_DISABLED', async () => {
    const request = require('supertest');
    await prisma.adminSettings.upsert({
      where: { id: 1 },
      create: { id: 1, commissionPercent: 20, vatPercent: 18, purchasesEnabled: false },
      update: { purchasesEnabled: false },
    });
    const candidate = await prisma.user.create({
      data: { email: 'c-pd@example.com', username: 'cpd', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const educator = await prisma.user.create({
      data: { email: 'e-pd@example.com', username: 'epd', passwordHash: 'x', role: 'EDUCATOR' },
    });
    const examType = await prisma.examType.create({
      data: { name: 'PD Exam', slug: 'pd-exam-' + Date.now(), active: true },
    });
    const test = await prisma.examTest.create({
      data: {
        title: 'PD Test',
        educatorId: educator.id,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        examTypeId: examType.id,
        priceCents: 1000,
      },
    });
    const token = jwtService.sign({ sub: candidate.id, email: candidate.email, role: 'CANDIDATE' });

    const res = await request(httpServer)
      .post(`/purchases/${test.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('PURCHASES_DISABLED');
  }, 30000);
});
