export {};
const { bootstrapTestApp, resetDb } = require('../helpers/test-app');

describe('Reviews cursor pagination integration', () => {
  let app, prisma, httpServer;
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

  test('cursor pagination returns nextCursor and privacy', async () => {
    // seed educator, test
    const educator = await prisma.user.create({ data: { email: 'edx@example.com', username: 'edx', passwordHash: 'x', role: 'EDUCATOR' } });
    const t = await prisma.examTest.create({ data: { title: 'RevTest', educatorId: educator.id, status: 'PUBLISHED', priceCents: 100, questionCount: 1 } });

    // create 3 candidates and reviews with specific createdAt
    const now = Date.now();
    const cand1 = await prisma.user.create({ data: { email: 'r1@example.com', username: 'r1', passwordHash: 'x', role: 'CANDIDATE' } });
    const cand2 = await prisma.user.create({ data: { email: 'r2@example.com', username: 'r2', passwordHash: 'x', role: 'CANDIDATE' } });
    const cand3 = await prisma.user.create({ data: { email: 'r3@example.com', username: 'r3', passwordHash: 'x', role: 'CANDIDATE' } });

    const r1 = await prisma.review.create({ data: { testId: t.id, educatorId: educator.id, candidateId: cand1.id, testRating: 5, comment: 'a', createdAt: new Date(now - 30000) } });
    const r2 = await prisma.review.create({ data: { testId: t.id, educatorId: educator.id, candidateId: cand2.id, testRating: 4, comment: 'b', createdAt: new Date(now - 20000) } });
    const r3 = await prisma.review.create({ data: { testId: t.id, educatorId: educator.id, candidateId: cand3.id, testRating: 3, comment: 'c', createdAt: new Date(now - 10000) } });

    const request = require('supertest');
    const res1 = await request(httpServer).get(`/tests/${t.id}/reviews?limit=2`);
    expect(res1.status).toBe(200);
    expect(res1.body.items.length).toBe(2);
    expect(res1.body.meta.nextCursor).toBeDefined();
    // privacy check
    expect(res1.body.items[0].candidateId).toBeUndefined();

    const nextCursor = res1.body.meta.nextCursor;
    const res2 = await request(httpServer).get(`/tests/${t.id}/reviews?limit=2&cursor=${nextCursor}`);
    expect(res2.status).toBe(200);
    expect(res2.body.items.length).toBe(1);

    const allIds = [...res1.body.items.map(i=>i.id), ...res2.body.items.map(i=>i.id)];
    const unique = Array.from(new Set(allIds));
    expect(unique.length).toBe(3);
  }, 30000);
});

