export {};
const { bootstrapTestApp, resetDb } = require('../helpers/test-app');

describe('Objections create (FR-A-06 mikro-1)', () => {
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

  test('candidate1 POST objection on own attempt -> 201', async () => {
    const request = require('supertest');
    const educator = await prisma.user.create({
      data: { email: 'ed-ob@example.com', username: 'edob', passwordHash: 'x', role: 'EDUCATOR' },
    });
    const candidate1 = await prisma.user.create({
      data: { email: 'c1-ob@example.com', username: 'c1ob', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const candidate2 = await prisma.user.create({
      data: { email: 'c2-ob@example.com', username: 'c2ob', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const examType = await prisma.examType.create({
      data: { name: 'OB Exam', slug: 'ob-exam-' + Date.now(), active: true },
    });
    const test = await prisma.examTest.create({
      data: {
        title: 'Objection Test',
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
        candidateId: candidate1.id,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });
    const token1 = jwtService.sign({ sub: candidate1.id, email: candidate1.email, role: 'CANDIDATE' });

    const res = await request(httpServer)
      .post('/objections')
      .set('Authorization', `Bearer ${token1}`)
      .send({ attemptId: attempt.id, questionId: question.id, reason: 'Answer key is wrong for this question.' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.attemptId).toBe(attempt.id);
    expect(res.body.questionId).toBe(question.id);
    expect(res.body.reporterId).toBe(candidate1.id);
    expect(res.body.reason).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
  }, 30000);

  test('candidate2 POST same attemptId -> 403 FORBIDDEN_NOT_OWNER', async () => {
    const request = require('supertest');
    const educator = await prisma.user.create({
      data: { email: 'ed-ob2@example.com', username: 'edob2', passwordHash: 'x', role: 'EDUCATOR' },
    });
    const candidate1 = await prisma.user.create({
      data: { email: 'c1-ob2@example.com', username: 'c1ob2', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const candidate2 = await prisma.user.create({
      data: { email: 'c2-ob2@example.com', username: 'c2ob2', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const examType = await prisma.examType.create({
      data: { name: 'OB Exam 2', slug: 'ob-exam2-' + Date.now(), active: true },
    });
    const test = await prisma.examTest.create({
      data: {
        title: 'Objection Test 2',
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
        candidateId: candidate1.id,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });
    const token2 = jwtService.sign({ sub: candidate2.id, email: candidate2.email, role: 'CANDIDATE' });

    const res = await request(httpServer)
      .post('/objections')
      .set('Authorization', `Bearer ${token2}`)
      .send({ attemptId: attempt.id, questionId: question.id, reason: 'I also want to object.' });
    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe('FORBIDDEN_NOT_OWNER');
  }, 30000);

  test('question from another test -> 409 QUESTION_NOT_IN_TEST', async () => {
    const request = require('supertest');
    const educator = await prisma.user.create({
      data: { email: 'ed-ob3@example.com', username: 'edob3', passwordHash: 'x', role: 'EDUCATOR' },
    });
    const candidate1 = await prisma.user.create({
      data: { email: 'c1-ob3@example.com', username: 'c1ob3', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const examType = await prisma.examType.create({
      data: { name: 'OB Exam 3', slug: 'ob-exam3-' + Date.now(), active: true },
    });
    const testA = await prisma.examTest.create({
      data: {
        title: 'Test A',
        educatorId: educator.id,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        examTypeId: examType.id,
      },
    });
    const testB = await prisma.examTest.create({
      data: {
        title: 'Test B',
        educatorId: educator.id,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        examTypeId: examType.id,
      },
    });
    const questionA = await prisma.examQuestion.create({
      data: { id: require('crypto').randomUUID(), testId: testA.id, content: 'QA', order: 1 },
    });
    const questionB = await prisma.examQuestion.create({
      data: { id: require('crypto').randomUUID(), testId: testB.id, content: 'QB', order: 1 },
    });
    await prisma.examOption.createMany({
      data: [
        { id: require('crypto').randomUUID(), questionId: questionA.id, content: 'A', isCorrect: true },
        { id: require('crypto').randomUUID(), questionId: questionA.id, content: 'B', isCorrect: false },
      ],
    });
    const attemptA = await prisma.testAttempt.create({
      data: {
        testId: testA.id,
        candidateId: candidate1.id,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });
    const token1 = jwtService.sign({ sub: candidate1.id, email: candidate1.email, role: 'CANDIDATE' });

    // attemptA is for testA; questionB belongs to testB -> QUESTION_NOT_IN_TEST
    const res = await request(httpServer)
      .post('/objections')
      .set('Authorization', `Bearer ${token1}`)
      .send({ attemptId: attemptA.id, questionId: questionB.id, reason: 'This question is from another test.' });
    expect(res.status).toBe(409);
    expect(res.body?.error?.code).toBe('QUESTION_NOT_IN_TEST');
  }, 30000);

  test('duplicate objection same attempt+question -> 409 OBJECTION_ALREADY_EXISTS', async () => {
    const request = require('supertest');
    const educator = await prisma.user.create({
      data: { email: 'ed-ob4@example.com', username: 'edob4', passwordHash: 'x', role: 'EDUCATOR' },
    });
    const candidate1 = await prisma.user.create({
      data: { email: 'c1-ob4@example.com', username: 'c1ob4', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const examType = await prisma.examType.create({
      data: { name: 'OB Exam 4', slug: 'ob-exam4-' + Date.now(), active: true },
    });
    const test = await prisma.examTest.create({
      data: {
        title: 'Objection Test 4',
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
        candidateId: candidate1.id,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });
    const token1 = jwtService.sign({ sub: candidate1.id, email: candidate1.email, role: 'CANDIDATE' });

    const first = await request(httpServer)
      .post('/objections')
      .set('Authorization', `Bearer ${token1}`)
      .send({ attemptId: attempt.id, questionId: question.id, reason: 'First objection for this question.' });
    expect(first.status).toBe(201);

    const second = await request(httpServer)
      .post('/objections')
      .set('Authorization', `Bearer ${token1}`)
      .send({ attemptId: attempt.id, questionId: question.id, reason: 'Duplicate objection same attempt and question.' });
    expect(second.status).toBe(409);
    expect(second.body?.error?.code).toBe('OBJECTION_ALREADY_EXISTS');
  }, 30000);

  test('21st objection on same test -> 429 OBJECTION_LIMIT_EXCEEDED (FR-A-06)', async () => {
    const request = require('supertest');
    const { OBJECTION_LIMIT_PER_TEST } = require('../../src/application/constants');
    const educator = await prisma.user.create({
      data: { email: 'ed-lim@example.com', username: 'edlim', passwordHash: 'x', role: 'EDUCATOR' },
    });
    const candidate = await prisma.user.create({
      data: { email: 'c-lim@example.com', username: 'clim', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const examType = await prisma.examType.create({
      data: { name: 'Limit Exam', slug: 'limit-exam-' + Date.now(), active: true },
    });
    const test = await prisma.examTest.create({
      data: {
        title: 'Limit Test',
        educatorId: educator.id,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        examTypeId: examType.id,
      },
    });
    const questions = [];
    for (let i = 0; i < OBJECTION_LIMIT_PER_TEST + 1; i++) {
      const q = await prisma.examQuestion.create({
        data: { id: require('crypto').randomUUID(), testId: test.id, content: `Q${i + 1}`, order: i + 1 },
      });
      await prisma.examOption.createMany({
        data: [
          { id: require('crypto').randomUUID(), questionId: q.id, content: 'A', isCorrect: true },
          { id: require('crypto').randomUUID(), questionId: q.id, content: 'B', isCorrect: false },
        ],
      });
      questions.push(q);
    }
    const attempt = await prisma.testAttempt.create({
      data: {
        testId: test.id,
        candidateId: candidate.id,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });
    const token = jwtService.sign({ sub: candidate.id, email: candidate.email, role: 'CANDIDATE' });

    for (let i = 0; i < OBJECTION_LIMIT_PER_TEST; i++) {
      const res = await request(httpServer)
        .post('/objections')
        .set('Authorization', `Bearer ${token}`)
        .send({ attemptId: attempt.id, questionId: questions[i].id, reason: 'Reason for objection number ' + (i + 1) + '.' });
      expect(res.status).toBe(201);
    }

    const overLimit = await request(httpServer)
      .post('/objections')
      .set('Authorization', `Bearer ${token}`)
      .send({ attemptId: attempt.id, questionId: questions[OBJECTION_LIMIT_PER_TEST].id, reason: 'This should exceed the limit.' });
    expect(overLimit.status).toBe(429);
    expect(overLimit.body?.error?.code).toBe('OBJECTION_LIMIT_EXCEEDED');
  }, 30000);
});
