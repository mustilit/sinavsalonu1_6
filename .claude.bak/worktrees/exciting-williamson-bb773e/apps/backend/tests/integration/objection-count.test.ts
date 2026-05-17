export {};
const { bootstrapTestApp } = require('../helpers/test-app');
const { PrismaObjectionRepository } = require('../../src/infrastructure/repositories/PrismaObjectionRepository');

describe('PrismaObjectionRepository.countByTestAndCandidate integration', () => {
  let app, httpServer, prisma, jwtService;
  let objectionRepo;
  beforeAll(async () => {
    const boot = await bootstrapTestApp();
    app = boot.app;
    httpServer = boot.httpServer;
    prisma = boot.prisma;
    jwtService = boot.jwtService;
    objectionRepo = new PrismaObjectionRepository();
  }, 30000);

  beforeEach(async () => {
    const { resetDb } = require('../helpers/test-app');
    await resetDb(prisma);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('counts objections by test and candidate correctly', async () => {
    // create users
    const educator = await prisma.user.create({ data: { email: 'ed1@example.com', username: 'ed1', passwordHash: 'x', role: 'EDUCATOR' } });
    const candidate = await prisma.user.create({ data: { email: 'cand1@example.com', username: 'cand1', passwordHash: 'x', role: 'CANDIDATE' } });
    const otherCandidate = await prisma.user.create({ data: { email: 'cand2@example.com', username: 'cand2', passwordHash: 'x', role: 'CANDIDATE' } });

    // create two tests
    const t1 = await prisma.examTest.create({ data: { title: 'T1', educatorId: educator.id, status: 'PUBLISHED', priceCents: 100, questionCount: 0 } });
    const t2 = await prisma.examTest.create({ data: { title: 'T2', educatorId: educator.id, status: 'PUBLISHED', priceCents: 100, questionCount: 0 } });

    // questions
    const q1 = await prisma.examQuestion.create({ data: { testId: t1.id, content: 'q1' } });
    const q2 = await prisma.examQuestion.create({ data: { testId: t1.id, content: 'q2' } });
    const q3 = await prisma.examQuestion.create({ data: { testId: t2.id, content: 'q3' } });

    // objections: two for candidate on t1, one for candidate on t2, one for otherCandidate on t1
    await prisma.objection.create({ data: { attemptId: 'a1', questionId: q1.id, reporterId: candidate.id, reason: 'r1' } });
    await prisma.objection.create({ data: { attemptId: 'a2', questionId: q2.id, reporterId: candidate.id, reason: 'r2' } });
    await prisma.objection.create({ data: { attemptId: 'a3', questionId: q3.id, reporterId: candidate.id, reason: 'r3' } });
    await prisma.objection.create({ data: { attemptId: 'a4', questionId: q1.id, reporterId: otherCandidate.id, reason: 'r4' } });

    const cnt1 = await objectionRepo.countByTestAndCandidate(t1.id, candidate.id);
    expect(cnt1).toBe(2);
    const cntOther = await objectionRepo.countByTestAndCandidate(t1.id, otherCandidate.id);
    expect(cntOther).toBe(1);
    const cnt2 = await objectionRepo.countByTestAndCandidate(t2.id, candidate.id);
    expect(cnt2).toBe(1);
  }, 30000);
});

