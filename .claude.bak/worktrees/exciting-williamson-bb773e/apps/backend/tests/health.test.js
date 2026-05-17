const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

describe('Health', () => {
  test('GET /health returns 200 ok', async () => {
    const res = await fetch('http://localhost:3000/health', { method: 'GET' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

