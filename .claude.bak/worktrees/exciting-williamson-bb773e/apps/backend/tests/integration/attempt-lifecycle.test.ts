export {};
const request = require('supertest');
const { seedMinimal } = require('../e2e/helpers/seed');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const API = 'http://localhost:3001';

describe('Attempt lifecycle integration', () => {
  let token;
  let testId;
  beforeAll(async () => {
    const seeded = await seedMinimal();
    token = seeded.candidateToken;
    testId = seeded.test.id;
    // enable solutions and add solution text
    await prisma.examTest.update({ where: { id: testId }, data: { hasSolutions: true, duration: 1, isTimed: true } });
    await prisma.examQuestion.update({ where: { id: 'q1' }, data: { solutionText: 'The correct answer is A' } });
  }, 20000);

  it('happy path: submit and view state/result/solution', async () => {
    const p = await request(API).post(`/purchases/${testId}`).set('Authorization', `Bearer ${token}`).send({ discountCode: null });
    expect([200,201]).toContain(p.status);
    const attempt = p.body.attempt ?? p.body;
    const attemptId = attempt.id;

    const preRes = await request(API).get(`/attempts/${attemptId}/result`).set('Authorization', `Bearer ${token}`);
    expect(preRes.status).toBe(409);
    expect(preRes.body && preRes.body.error && preRes.body.error.code).toBe('ATTEMPT_NOT_FINISHED');

    const ans = await request(API).post(`/attempts/${attemptId}/answers`).set('Authorization', `Bearer ${token}`).send({ questionId: 'q1', optionId: 'o1' });
    expect([200,201]).toContain(ans.status);

    const fin = await request(API).post(`/attempts/${attemptId}/finish`).set('Authorization', `Bearer ${token}`).send();
    expect([200,201]).toContain(fin.status);

    const st = await request(API).get(`/attempts/${attemptId}/state`).set('Authorization', `Bearer ${token}`);
    expect(st.status).toBe(200);
    expect(st.body.attempt.status).toBe('SUBMITTED');
    expect(st.body.attempt.remainingSeconds).toBe(0);

    const res = await request(API).get(`/attempts/${attemptId}/result`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.summary.total).toBeGreaterThan(0);

    const sol = await request(API).get(`/attempts/${attemptId}/questions/q1/solution`).set('Authorization', `Bearer ${token}`);
    expect(sol.status).toBe(200);
    expect(sol.body.solutionText).toBeTruthy();
  }, 60000);

  it('timeout path: timeout finalize and view result/solution', async () => {
    // create new purchase/attempt
    const p2 = await request(API).post(`/purchases/${testId}`).set('Authorization', `Bearer ${token}`).send({ discountCode: null });
    expect([200,201]).toContain(p2.status);
    const attempt2 = p2.body.attempt ?? p2.body;
    const attemptId2 = attempt2.id;

    // fast-forward attempt startedAt to past to force timeout
    await prisma.testAttempt.update({ where: { id: attemptId2 }, data: { startedAt: new Date(Date.now() - 10 * 60 * 1000) } });

    const to = await request(API).post(`/attempts/${attemptId2}/timeout`).set('Authorization', `Bearer ${token}`).send();
    expect([200,201]).toContain(to.status);

    const res2 = await request(API).get(`/attempts/${attemptId2}/result`).set('Authorization', `Bearer ${token}`);
    expect(res2.status).toBe(200);

    const sol2 = await request(API).get(`/attempts/${attemptId2}/questions/q1/solution`).set('Authorization', `Bearer ${token}`);
    expect(sol2.status).toBe(200);
  }, 60000);
});

