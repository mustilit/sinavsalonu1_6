export {};
const { bootstrapTestApp, resetDb } = require('../helpers/test-app');
const { processTestStatsRefresh } = require('../../src/infrastructure/queue/stats.processor');

describe('TestStats processor integration', () => {
  let app, prisma;
  beforeAll(async () => {
    const boot = await bootstrapTestApp();
    app = boot.app;
    prisma = boot.prisma;
  }, 30000);

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDb(prisma);
  });

  test('processor computes aggregates and upserts TestStats', async () => {
    const educator = await prisma.user.create({ data: { email: 'edx1@example.com', username: 'edx1', passwordHash: 'x', role: 'EDUCATOR' } });
    const candidate1 = await prisma.user.create({ data: { email: 'c1x@example.com', username: 'c1x', passwordHash: 'x', role: 'CANDIDATE' } });
    const candidate2 = await prisma.user.create({ data: { email: 'c2x@example.com', username: 'c2x', passwordHash: 'x', role: 'CANDIDATE' } });
    const candidate3 = await prisma.user.create({ data: { email: 'c3x@example.com', username: 'c3x', passwordHash: 'x', role: 'CANDIDATE' } });

    const test = await prisma.examTest.create({ data: { title: 'StatsTest', educatorId: educator.id, status: 'PUBLISHED', publishedAt: new Date(), priceCents: 100, questionCount: 1 } });

    // purchases (3 farklı aday)
    await prisma.purchase.createMany({ data: [{ testId: test.id, candidateId: candidate1.id, amountCents: 100 }, { testId: test.id, candidateId: candidate2.id, amountCents: 100 }, { testId: test.id, candidateId: candidate3.id, amountCents: 100 }] });

    // reviews
    await prisma.review.create({ data: { testId: test.id, educatorId: educator.id, candidateId: candidate1.id, testRating: 5 } });
    await prisma.review.create({ data: { testId: test.id, educatorId: educator.id, candidateId: candidate2.id, testRating: 3 } });

    const res = await processTestStatsRefresh(prisma, test.id);
    expect(res.ratingCount).toBe(2);
    expect(res.ratingAvg).toBeCloseTo(4.0, 5);
    expect(res.purchaseCount).toBe(3);

    // idempotent: call again
    const res2 = await processTestStatsRefresh(prisma, test.id);
    expect(res2.ratingCount).toBe(2);
  }, 30000);
});

