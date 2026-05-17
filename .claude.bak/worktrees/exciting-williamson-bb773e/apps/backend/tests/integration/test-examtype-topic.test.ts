export {};
const { bootstrapTestApp, resetDb } = require('../helpers/test-app');

describe('Test examType/topic (FR-E-03)', () => {
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

  test('educator create test with examTypeId + topicId returns 201 and body has examTypeId/topicId', async () => {
    const request = require('supertest');
    const educator = await prisma.user.create({
      data: { email: 'edu-et@example.com', username: 'eduett', passwordHash: 'x', role: 'EDUCATOR' },
    });
    const examType = await prisma.examType.create({
      data: { name: 'KPSS', slug: 'kpss-' + Date.now(), active: true },
    });
    const topic = await prisma.topic.create({
      data: { examTypeId: examType.id, name: 'Matematik', slug: 'matematik', active: true },
    });
    const token = jwtService.sign({ sub: educator.id, email: educator.email, role: 'EDUCATOR' });

    const res = await request(httpServer)
      .post('/tests')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Deneme Test', examTypeId: examType.id, topicId: topic.id });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.examTypeId).toBe(examType.id);
    expect(res.body.topicId).toBe(topic.id);
  }, 30000);

  test('create test with examTypeId A and topicId B (B under different exam type) returns 409 TOPIC_EXAMTYPE_MISMATCH', async () => {
    const request = require('supertest');
    const educator = await prisma.user.create({
      data: { email: 'edu-mismatch@example.com', username: 'edumismatch', passwordHash: 'x', role: 'EDUCATOR' },
    });
    const examTypeA = await prisma.examType.create({
      data: { name: 'Type A', slug: 'type-a-' + Date.now(), active: true },
    });
    const examTypeB = await prisma.examType.create({
      data: { name: 'Type B', slug: 'type-b-' + Date.now(), active: true },
    });
    const topicB = await prisma.topic.create({
      data: { examTypeId: examTypeB.id, name: 'Topic B', slug: 'topic-b', active: true },
    });
    const token = jwtService.sign({ sub: educator.id, email: educator.email, role: 'EDUCATOR' });

    const res = await request(httpServer)
      .post('/tests')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Mismatch Test', examTypeId: examTypeA.id, topicId: topicB.id });
    expect(res.status).toBe(409);
    expect(res.body.error?.code || res.body.code).toBe('TOPIC_EXAMTYPE_MISMATCH');
  }, 30000);

  test('publish test without examTypeId returns 409 TEST_TAXONOMY_REQUIRED', async () => {
    const request = require('supertest');
    const educator = await prisma.user.create({
      data: { email: 'edu-pub@example.com', username: 'edupub', passwordHash: 'x', role: 'EDUCATOR', status: 'ACTIVE', educatorApprovedAt: new Date() },
    });
    const token = jwtService.sign({ sub: educator.id, email: educator.email, role: 'EDUCATOR' });
    const testNoTax = await request(httpServer)
      .post('/tests')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'No taxonomy test' });
    expect(testNoTax.status).toBe(201);
    const testId = testNoTax.body.id;

    const publishRes = await request(httpServer)
      .put(`/tests/${testId}/publish`)
      .set('Authorization', `Bearer ${token}`);
    expect(publishRes.status).toBe(409);
    expect(publishRes.body.error?.code || publishRes.body.code).toBe('TEST_TAXONOMY_REQUIRED');
  }, 30000);
});
