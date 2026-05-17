const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

describe('Marketplace', () => {
  test('GET /marketplace/tests returns array', async () => {
    const res = await fetch('http://localhost:3000/marketplace/tests');
    expect([200, 304]).toContain(res.status);
    if (res.status === 200) {
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
    }
  });
});

