const request = require('supertest');
const { seedMinimal } = require('./helpers/seed');
const API = 'http://localhost:3001';

describe('E2E smoke', () => {
  let token;
  let testId;
  let attemptId;
  beforeAll(async () => {
    const seeded = await seedMinimal();
    token = seeded.candidateToken;
    testId = seeded.test.id;
  }, 20000);

  it('health ok', async () => {
    const res = await request(API).get('/health');
    expect(res.status).toBe(200);
  });

  it('unsubscribe endpoint handles missing token', async () => {
    const res = await request(API).get('/notifications/unsubscribe');
    expect([200,400,404]).toContain(res.status);
  });

  it('marketplace list', async () => {
    const res = await request(API).get('/marketplace/tests');
    expect(res.status).toBe(200);
    const items = res.body.items ?? res.body;
    expect(Array.isArray(items)).toBe(true);
  });

  it('rbac negative: purchase without token -> 401', async () => {
    const res = await request(API).post(`/purchases/${testId}`).send({ discountCode: null });
    expect(res.status).toBe(401);
  });

  it('purchase flow with token', async () => {
    const p = await request(API).post(`/purchases/${testId}`).set('Authorization', `Bearer ${token}`).send({ discountCode: null });
    expect([200,201]).toContain(p.status);
    if (p.status === 201 || p.status === 200) {
      const attempt = p.body.attempt ?? p.body;
      attemptId = attempt.id ?? attempt?.id;
      expect(attemptId).toBeTruthy();
    }
  }, 60000);

  it('attempt answer and finish require token', async () => {
    // without token finish should be 401
    const finNo = await request(API).post(`/attempts/${attemptId}/finish`).send();
    expect(finNo.status).toBe(401);
    // with token submit answer and finish
    const ans = await request(API).post(`/attempts/${attemptId}/answers`).set('Authorization', `Bearer ${token}`).send({ questionId: 'q1', optionId: 'o1' });
    expect([200,201]).toContain(ans.status);
    const fin = await request(API).post(`/attempts/${attemptId}/finish`).set('Authorization', `Bearer ${token}`).send();
    expect([200,201]).toContain(fin.status);
  }, 60000);
});

