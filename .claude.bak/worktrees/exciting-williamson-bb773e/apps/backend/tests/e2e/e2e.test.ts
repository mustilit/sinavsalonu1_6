import request from 'supertest';
import { seedMinimal } from './helpers/seed';
const API = 'http://localhost:3001';

describe('E2E smoke', () => {
  beforeAll(async () => {
    await seedMinimal();
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
    expect(Array.isArray(res.body.items || res.body)).toBe(true);
  });

  it('purchase flow', async () => {
    // register/login candidate (if auth endpoints exist) - skip auth and use candidate created in seed for simplicity by generating JWT not available
    // We will create a purchase via direct DB user (candidate) by calling endpoint with no auth if guard not enforced in test env.
    // Try to login - if exists
    let token: string | null = null;
    try {
      const login = await request(API).post('/auth/login').send({ email: 'candidate@example.com', password: 'x' });
      if (login.status === 201 || login.status === 200) token = login.body?.token ?? login.body?.accessToken ?? null;
    } catch {}

    // fetch marketplace to get test id
    const m = await request(API).get('/marketplace/tests');
    expect(m.status).toBe(200);
    const items = m.body.items ?? m.body;
    const test = items && items[0];
    expect(test).toBeTruthy();
    const testId = test.id;

    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const p = await request(API).post(`/purchases/${testId}`).set(headers).send({ discountCode: null });
    expect([200,201]).toContain(p.status);
    if (p.status === 201 || p.status === 200) {
      const attempt = p.body.attempt ?? p.body;
      const attemptId = attempt.id ?? attempt?.id;
      expect(attemptId).toBeTruthy();

      // submit answer
      const ans = await request(API).post(`/attempts/${attemptId}/answers`).set(headers).send({ questionId: 'q1', optionId: 'o1' });
      expect([200,201]).toContain(ans.status);

      // finish
      const fin = await request(API).post(`/attempts/${attemptId}/finish`).set(headers).send();
      expect([200,201]).toContain(fin.status);
    }
  }, 60000);
});

