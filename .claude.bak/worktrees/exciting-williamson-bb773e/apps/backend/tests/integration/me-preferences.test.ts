export {};
const { bootstrapTestApp, resetDb } = require('../helpers/test-app');

describe('Me preferences (FR-A-15)', () => {
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

  test('GET /me/preferences returns defaults for user without preferences', async () => {
    const request = require('supertest');
    const user = await prisma.user.create({
      data: { email: 'pref@example.com', username: 'prefuser', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const token = jwtService.sign({ sub: user.id, email: user.email, role: 'CANDIDATE' });

    const res = await request(httpServer)
      .get('/me/preferences')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(typeof res.body).toBe('object');
  }, 30000);

  test('PATCH /me/preferences updates and persists', async () => {
    const request = require('supertest');
    const user = await prisma.user.create({
      data: { email: 'pref2@example.com', username: 'prefuser2', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const token = jwtService.sign({ sub: user.id, email: user.email, role: 'CANDIDATE' });

    const patch = await request(httpServer)
      .patch('/me/preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({ theme: 'dark', fontSize: 14 });
    expect(patch.status).toBe(200);

    const get = await request(httpServer)
      .get('/me/preferences')
      .set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(200);
    expect(get.body.theme).toBe('dark');
    expect(get.body.fontSize).toBe(14);
  }, 30000);
});
