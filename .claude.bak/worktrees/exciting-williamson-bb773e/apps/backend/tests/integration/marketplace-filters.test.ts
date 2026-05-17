export {};
const { bootstrapTestApp, resetDb } = require('../helpers/test-app');

describe('Marketplace filters and sort (FR-A-02)', () => {
  let app: any, prisma: any, httpServer: any;

  beforeAll(async () => {
    const boot = await bootstrapTestApp();
    app = boot.app;
    prisma = boot.prisma;
    httpServer = boot.httpServer;
  }, 30000);

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDb(prisma);
  });

  test('topicId, educatorId, maxPriceCents, sort filters work', async () => {
    const request = require('supertest');

    const educator1 = await prisma.user.create({
      data: { email: 'edu1-mp@example.com', username: 'edu1mp', passwordHash: 'x', role: 'EDUCATOR' },
    });
    const educator2 = await prisma.user.create({
      data: { email: 'edu2-mp@example.com', username: 'edu2mp', passwordHash: 'x', role: 'EDUCATOR' },
    });

    const examTypeA = await prisma.examType.create({
      data: { name: 'Type A', slug: 'type-a-' + Date.now(), active: true },
    });
    const examTypeB = await prisma.examType.create({
      data: { name: 'Type B', slug: 'type-b-' + Date.now(), active: true },
    });

    const topicA = await prisma.topic.create({
      data: { examTypeId: examTypeA.id, name: 'Topic A', slug: 'topic-a', active: true },
    });
    const topicB = await prisma.topic.create({
      data: { examTypeId: examTypeB.id, name: 'Topic B', slug: 'topic-b', active: true },
    });

    const now = new Date();
    const published1 = await prisma.examTest.create({
      data: {
        title: 'Published A1',
        status: 'PUBLISHED',
        publishedAt: now,
        examTypeId: examTypeA.id,
        topicId: topicA.id,
        educatorId: educator1.id,
        priceCents: 100,
        isTimed: false,
      },
    });
    const published2 = await prisma.examTest.create({
      data: {
        title: 'Published A2',
        status: 'PUBLISHED',
        publishedAt: now,
        examTypeId: examTypeA.id,
        topicId: topicA.id,
        educatorId: educator2.id,
        priceCents: 200,
        isTimed: false,
      },
    });
    await prisma.examTest.create({
      data: {
        title: 'Draft B',
        status: 'DRAFT',
        publishedAt: null,
        examTypeId: examTypeB.id,
        topicId: topicB.id,
        educatorId: educator1.id,
        priceCents: 50,
        isTimed: false,
      },
    });

    const base = '/marketplace/tests';

    const byTopicA = await request(httpServer).get(`${base}?topicId=${topicA.id}`);
    expect(byTopicA.status).toBe(200);
    expect(Array.isArray(byTopicA.body.items)).toBe(true);
    expect(byTopicA.body.items.length).toBe(2);
    expect(byTopicA.body.items.map((t: any) => t.id).sort()).toEqual([published1.id, published2.id].sort());

    const byEducator1 = await request(httpServer).get(`${base}?educatorId=${educator1.id}`);
    expect(byEducator1.status).toBe(200);
    expect(byEducator1.body.items.length).toBe(1);
    expect(byEducator1.body.items[0].id).toBe(published1.id);
    expect(byEducator1.body.items[0].educatorId).toBe(educator1.id);

    const maxPrice150 = await request(httpServer).get(`${base}?maxPriceCents=150`);
    expect(maxPrice150.status).toBe(200);
    expect(maxPrice150.body.items.length).toBe(1);
    expect(maxPrice150.body.items[0].priceCents).toBe(100);

    const sortDesc = await request(httpServer).get(`${base}?sort=priceDesc`);
    expect(sortDesc.status).toBe(200);
    expect(sortDesc.body.items.length).toBe(2);
    expect(sortDesc.body.items[0].priceCents).toBe(200);
    expect(sortDesc.body.items[0].id).toBe(published2.id);

    const byExamTypeA = await request(httpServer).get(`${base}?examTypeId=${examTypeA.id}`);
    expect(byExamTypeA.status).toBe(200);
    expect(byExamTypeA.body.items.length).toBe(2);
    expect(byExamTypeA.body.items.map((t: any) => t.examTypeId)).toEqual([examTypeA.id, examTypeA.id]);

    await prisma.testStats.upsert({
      where: { testId: published1.id },
      create: { testId: published1.id, ratingAvg: 4.5, ratingCount: 10, purchaseCount: 5, updatedAt: new Date() },
      update: { ratingAvg: 4.5, ratingCount: 10, updatedAt: new Date() },
    });
    await prisma.testStats.upsert({
      where: { testId: published2.id },
      create: { testId: published2.id, ratingAvg: 2.0, ratingCount: 3, purchaseCount: 1, updatedAt: new Date() },
      update: { ratingAvg: 2.0, ratingCount: 3, updatedAt: new Date() },
    });
    const minRating4 = await request(httpServer).get(`${base}?minRating=4`);
    expect(minRating4.status).toBe(200);
    expect(minRating4.body.items.length).toBe(1);
    expect(minRating4.body.items[0].id).toBe(published1.id);
    expect(minRating4.body.items[0].ratingAvg).toBe(4.5);
  }, 30000);
});
