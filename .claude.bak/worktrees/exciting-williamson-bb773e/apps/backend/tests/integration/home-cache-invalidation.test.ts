export {};
const { bootstrapTestApp, resetDb, resetRedis } = require('../helpers/test-app');
const IORedis = require('ioredis');

describe('Home cache invalidation integration', () => {
  let app, httpServer, prisma, jwtService;
  beforeAll(async () => {
    const boot = await bootstrapTestApp();
    app = boot.app;
    httpServer = boot.httpServer;
    prisma = boot.prisma;
    jwtService = boot.jwtService;
  }, 30000);

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDb(prisma);
    await resetRedis();
  });

  test('publish invalidates follower caches', async () => {
    const redisUrl = process.env.REDIS_URL || null;
    if (!redisUrl) return; // skip if no redis in env
    const redis = new IORedis(redisUrl);

    // seed educator (approved + active for publish), candidate, follow
    const educator = await prisma.user.create({
      data: { email: 'ed@example.com', username: 'ed', passwordHash: 'x', role: 'EDUCATOR', status: 'ACTIVE', educatorApprovedAt: new Date() },
    });
    const candidate = await prisma.user.create({ data: { email: 'c1@example.com', username: 'c1', passwordHash: 'x', role: 'CANDIDATE' } });
    await prisma.follow.create({ data: { followerId: candidate.id, followType: 'EDUCATOR', educatorId: educator.id } });

    // create DRAFT test with >=5 questions
    const test = await prisma.examTest.create({
      data: {
        title: 'PubTest',
        educatorId: educator.id,
        status: 'DRAFT',
        priceCents: 1000,
        questionCount: 5,
        questions: {
          create: Array.from({ length: 5 }).map((_, i) => ({
            id: `q${i+1}`,
            content: `q${i+1}`,
            order: i+1,
            options: { create: [{ id: `o${i+1}a`, content: 'A', isCorrect: true }, { id: `o${i+1}b`, content: 'B', isCorrect: false }] },
          })),
        },
      },
    });

    const key = `home:rec:${candidate.id}:all:v1`;
    await redis.set(key, 'dummy', 'EX', 600);
    let v = await redis.get(key);
    expect(v).toBe('dummy');

    // publish via use-case (userRepo required for educator enforcement)
    const { PublishTestUseCase } = require('../../src/application/use-cases/PublishTestUseCase');
    const { PrismaExamRepository } = require('../../src/infrastructure/repositories/PrismaExamRepository');
    const { PrismaAuditLogRepository } = require('../../src/infrastructure/repositories/PrismaAuditLogRepository');
    const { PrismaUserRepository } = require('../../src/infrastructure/repositories/PrismaUserRepository');
    const publishUc = new PublishTestUseCase(new PrismaExamRepository(), new PrismaAuditLogRepository(), new PrismaUserRepository());
    await publishUc.execute(test.id, educator.id);

    // key should be gone
    v = await redis.get(key);
    expect(v).toBe(null);
    await redis.quit();
  }, 60000);

  test('purchase invalidates candidate cache', async () => {
    const redisUrl = process.env.REDIS_URL || null;
    if (!redisUrl) return;
    const redis = new IORedis(redisUrl);

    const educator = await prisma.user.create({ data: { email: 'ed2@example.com', username: 'ed2', passwordHash: 'x', role: 'EDUCATOR' } });
    const candidate = await prisma.user.create({ data: { email: 'c2@example.com', username: 'c2', passwordHash: 'x', role: 'CANDIDATE' } });
    const test = await prisma.examTest.create({
      data: {
        title: 'BuyTest',
        educatorId: educator.id,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        priceCents: 500,
        questionCount: 1,
        questions: { create: { id: 'q1', content: 'q1', options: { create: [{ id: 'o1', content: 'A', isCorrect: true }, { id: 'o2', content: 'B', isCorrect: false }] } } },
      },
      include: { questions: true },
    });

    const key = `home:rec:${candidate.id}:all:v1`;
    await redis.set(key, 'dummy', 'EX', 600);
    let v = await redis.get(key);
    expect(v).toBe('dummy');

    // call purchase use-case
    const { PurchaseUseCase } = require('../../src/application/use-cases/PurchaseUseCase');
    const purchaseUc = new PurchaseUseCase(prisma);
    await purchaseUc.execute(test.id, candidate.id);

    v = await redis.get(key);
    expect(v).toBe(null);
    await redis.quit();
  }, 60000);
});

