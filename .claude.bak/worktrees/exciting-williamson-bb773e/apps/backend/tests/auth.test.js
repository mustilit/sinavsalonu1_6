const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const jwt = require('jsonwebtoken');

describe('Auth register/login', () => {
  test('register and login returns token', async () => {
    const email = `test_${Date.now()}@example.com`;
    const username = `user_${Date.now()}`;
    const password = 'Password123';
    // register
    const reg = await fetch('http://localhost:3000/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password }),
    });
    expect([200,201,204]).toContain(reg.status);
    // login
    const login = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    expect(login.status).toBe(200);
    const body = await login.json();
    expect(body.token || body.token).toBeTruthy();
  });
});

