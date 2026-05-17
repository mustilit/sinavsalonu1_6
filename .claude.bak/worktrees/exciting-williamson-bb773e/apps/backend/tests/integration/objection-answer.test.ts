export {};
const { bootstrapTestApp, resetDb } = require('../helpers/test-app');

describe('Objection answer + SLA (FR-E-08 mikro-1)', () => {
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

  test('educator onaylı + active answers within SLA -> 200, status ANSWERED', async () => {
    const request = require('supertest');
    const educator = await prisma.user.create({
      data: {
        email: 'ed-ans@example.com',
        username: 'edans',
        passwordHash: 'x',
        role: 'EDUCATOR',
        status: 'ACTIVE',
        educatorApprovedAt: new Date(),
      },
    });
    const candidate = await prisma.user.create({
      data: { email: 'c-ans@example.com', username: 'cans', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const examType = await prisma.examType.create({
      data: { name: 'Ans Exam', slug: 'ans-exam-' + Date.now(), active: true },
    });
    const test = await prisma.examTest.create({
      data: {
        title: 'Answer Test',
        educatorId: educator.id,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        examTypeId: examType.id,
      },
    });
    const question = await prisma.examQuestion.create({
      data: { id: require('crypto').randomUUID(), testId: test.id, content: 'Q1', order: 1 },
    });
    await prisma.examOption.createMany({
      data: [
        { id: require('crypto').randomUUID(), questionId: question.id, content: 'A', isCorrect: true },
        { id: require('crypto').randomUUID(), questionId: question.id, content: 'B', isCorrect: false },
      ],
    });
    const attempt = await prisma.testAttempt.create({
      data: {
        testId: test.id,
        candidateId: candidate.id,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });
    const objection = await prisma.objection.create({
      data: {
        attemptId: attempt.id,
        questionId: question.id,
        reporterId: candidate.id,
        reason: 'I think the answer key is wrong for this question.',
      },
    });
    const educatorToken = jwtService.sign({ sub: educator.id, email: educator.email, role: 'EDUCATOR' });

    const res = await request(httpServer)
      .post(`/educators/me/objections/${objection.id}/answer`)
      .set('Authorization', `Bearer ${educatorToken}`)
      .send({ answerText: 'We have reviewed and the key is correct as per the source.' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ANSWERED');
    expect(res.body.answerText).toBeDefined();
    expect(res.body.answeredAt).toBeDefined();

    const updated = await prisma.objection.findUnique({ where: { id: objection.id } });
    expect(updated?.status).toBe('ANSWERED');
    expect(updated?.answerText).toBeDefined();
    expect(updated?.answeredAt).toBeDefined();
    expect(new Date(updated?.answeredAt).getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  }, 30000);

  test('SLA expired: objection 11 days old -> 409 OBJECTION_SLA_EXPIRED, status ESCALATED', async () => {
    const request = require('supertest');
    const educator = await prisma.user.create({
      data: {
        email: 'ed-sla@example.com',
        username: 'edsla',
        passwordHash: 'x',
        role: 'EDUCATOR',
        status: 'ACTIVE',
        educatorApprovedAt: new Date(),
      },
    });
    const candidate = await prisma.user.create({
      data: { email: 'c-sla@example.com', username: 'csla', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const examType = await prisma.examType.create({
      data: { name: 'SLA Exam', slug: 'sla-exam-' + Date.now(), active: true },
    });
    const test = await prisma.examTest.create({
      data: {
        title: 'SLA Test',
        educatorId: educator.id,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        examTypeId: examType.id,
      },
    });
    const question = await prisma.examQuestion.create({
      data: { id: require('crypto').randomUUID(), testId: test.id, content: 'Q1', order: 1 },
    });
    await prisma.examOption.createMany({
      data: [
        { id: require('crypto').randomUUID(), questionId: question.id, content: 'A', isCorrect: true },
        { id: require('crypto').randomUUID(), questionId: question.id, content: 'B', isCorrect: false },
      ],
    });
    const attempt = await prisma.testAttempt.create({
      data: {
        testId: test.id,
        candidateId: candidate.id,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });
    const objection = await prisma.objection.create({
      data: {
        attemptId: attempt.id,
        questionId: question.id,
        reporterId: candidate.id,
        reason: 'Old objection for SLA test.',
      },
    });
    const elevenDaysAgo = new Date(Date.now() - 11 * 24 * 60 * 60 * 1000);
    await prisma.$executeRawUnsafe(
      `UPDATE objections SET "createdAt" = $1 WHERE id = $2`,
      elevenDaysAgo,
      objection.id,
    );
    const educatorToken = jwtService.sign({ sub: educator.id, email: educator.email, role: 'EDUCATOR' });

    const res = await request(httpServer)
      .post(`/educators/me/objections/${objection.id}/answer`)
      .set('Authorization', `Bearer ${educatorToken}`)
      .send({ answerText: 'Trying to answer after SLA expired.' });
    expect(res.status).toBe(409);
    expect(res.body?.error?.code).toBe('OBJECTION_SLA_EXPIRED');

    const updated = await prisma.objection.findUnique({ where: { id: objection.id } });
    expect(updated?.status).toBe('ESCALATED');

    const admin = await prisma.user.create({
      data: { email: 'admin-sla@example.com', username: 'adminsla', passwordHash: 'x', role: 'ADMIN' },
    });
    const adminToken = jwtService.sign({ sub: admin.id, email: admin.email, role: 'ADMIN' });
    const listRes = await request(httpServer)
      .get('/admin/objections?status=ESCALATED')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    const found = listRes.body.find((o: any) => o.id === objection.id);
    expect(found).toBeDefined();
  }, 30000);

  test('owner olmayan educator answer -> 403 FORBIDDEN_NOT_OWNER', async () => {
    const request = require('supertest');
    const educatorOwner = await prisma.user.create({
      data: {
        email: 'ed-own@example.com',
        username: 'edown',
        passwordHash: 'x',
        role: 'EDUCATOR',
        status: 'ACTIVE',
        educatorApprovedAt: new Date(),
      },
    });
    const educatorOther = await prisma.user.create({
      data: {
        email: 'ed-other@example.com',
        username: 'edother',
        passwordHash: 'x',
        role: 'EDUCATOR',
        status: 'ACTIVE',
        educatorApprovedAt: new Date(),
      },
    });
    const candidate = await prisma.user.create({
      data: { email: 'c-own@example.com', username: 'cown', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const examType = await prisma.examType.create({
      data: { name: 'Own Exam', slug: 'own-exam-' + Date.now(), active: true },
    });
    const test = await prisma.examTest.create({
      data: {
        title: 'Owner Test',
        educatorId: educatorOwner.id,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        examTypeId: examType.id,
      },
    });
    const question = await prisma.examQuestion.create({
      data: { id: require('crypto').randomUUID(), testId: test.id, content: 'Q1', order: 1 },
    });
    await prisma.examOption.createMany({
      data: [
        { id: require('crypto').randomUUID(), questionId: question.id, content: 'A', isCorrect: true },
        { id: require('crypto').randomUUID(), questionId: question.id, content: 'B', isCorrect: false },
      ],
    });
    const attempt = await prisma.testAttempt.create({
      data: {
        testId: test.id,
        candidateId: candidate.id,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });
    const objection = await prisma.objection.create({
      data: {
        attemptId: attempt.id,
        questionId: question.id,
        reporterId: candidate.id,
        reason: 'Reason for owner test.',
      },
    });
    const otherToken = jwtService.sign({ sub: educatorOther.id, email: educatorOther.email, role: 'EDUCATOR' });

    const res = await request(httpServer)
      .post(`/educators/me/objections/${objection.id}/answer`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ answerText: 'Other educator trying to answer.' });
    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe('FORBIDDEN_NOT_OWNER');
  }, 30000);

  test('onaysız educator answer -> 403 EDUCATOR_NOT_APPROVED', async () => {
    const request = require('supertest');
    const educator = await prisma.user.create({
      data: {
        email: 'ed-unapp@example.com',
        username: 'edunapp',
        passwordHash: 'x',
        role: 'EDUCATOR',
        status: 'ACTIVE',
        educatorApprovedAt: null,
      },
    });
    const candidate = await prisma.user.create({
      data: { email: 'c-unapp@example.com', username: 'cunapp', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const examType = await prisma.examType.create({
      data: { name: 'Unapp Exam', slug: 'unapp-exam-' + Date.now(), active: true },
    });
    const test = await prisma.examTest.create({
      data: {
        title: 'Unapproved Test',
        educatorId: educator.id,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        examTypeId: examType.id,
      },
    });
    const question = await prisma.examQuestion.create({
      data: { id: require('crypto').randomUUID(), testId: test.id, content: 'Q1', order: 1 },
    });
    await prisma.examOption.createMany({
      data: [
        { id: require('crypto').randomUUID(), questionId: question.id, content: 'A', isCorrect: true },
        { id: require('crypto').randomUUID(), questionId: question.id, content: 'B', isCorrect: false },
      ],
    });
    const attempt = await prisma.testAttempt.create({
      data: {
        testId: test.id,
        candidateId: candidate.id,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });
    const objection = await prisma.objection.create({
      data: {
        attemptId: attempt.id,
        questionId: question.id,
        reporterId: candidate.id,
        reason: 'Reason for unapproved educator.',
      },
    });
    const educatorToken = jwtService.sign({ sub: educator.id, email: educator.email, role: 'EDUCATOR' });

    const res = await request(httpServer)
      .post(`/educators/me/objections/${objection.id}/answer`)
      .set('Authorization', `Bearer ${educatorToken}`)
      .send({ answerText: 'Unapproved educator trying to answer.' });
    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe('EDUCATOR_NOT_APPROVED');
  }, 30000);
});
