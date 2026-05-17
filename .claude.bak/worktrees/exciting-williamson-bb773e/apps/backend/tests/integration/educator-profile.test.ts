export {};
const { bootstrapTestApp, resetDb } = require('../helpers/test-app');

describe('Educator profile PATCH (FR-E-02)', () => {
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

  test('PATCH /educators/me with metadata -> 200, metadata persisted', async () => {
    const request = require('supertest');
    const educator = await prisma.user.create({
      data: {
        email: 'edu-patch@example.com',
        username: 'edupatch',
        passwordHash: 'x',
        role: 'EDUCATOR',
        status: 'ACTIVE',
        educatorApprovedAt: new Date(),
      },
    });
    const token = jwtService.sign({ sub: educator.id, email: educator.email, role: 'EDUCATOR' });

    const res = await request(httpServer)
      .patch('/educators/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ metadata: { bio: 'Math teacher', displayName: 'Dr. Smith', avatarUrl: 'https://example.com/av.png' } });
    expect(res.status).toBe(200);
    expect(res.body.metadata).toBeDefined();
    expect(res.body.metadata.bio).toBe('Math teacher');
    expect(res.body.metadata.displayName).toBe('Dr. Smith');
    expect(res.body.metadata.avatarUrl).toBe('https://example.com/av.png');

    const updated = await prisma.user.findUnique({ where: { id: educator.id } });
    expect(updated.metadata).toBeDefined();
    expect((updated.metadata as any).bio).toBe('Math teacher');
  }, 30000);

  test('PATCH /educators/me candidate -> 403', async () => {
    const request = require('supertest');
    const candidate = await prisma.user.create({
      data: { email: 'c-patch@example.com', username: 'cpatch', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const token = jwtService.sign({ sub: candidate.id, email: candidate.email, role: 'CANDIDATE' });

    const res = await request(httpServer)
      .patch('/educators/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ metadata: { bio: 'Not allowed' } });
    expect(res.status).toBe(403);
  }, 30000);

  test('PATCH /educators/me non-whitelist keys ignored', async () => {
    const request = require('supertest');
    const educator = await prisma.user.create({
      data: {
        email: 'edu-whitelist@example.com',
        username: 'eduwhitelist',
        passwordHash: 'x',
        role: 'EDUCATOR',
        status: 'ACTIVE',
        educatorApprovedAt: new Date(),
      },
    });
    const token = jwtService.sign({ sub: educator.id, email: educator.email, role: 'EDUCATOR' });

    const res = await request(httpServer)
      .patch('/educators/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ metadata: { bio: 'OK', maliciousField: 'ignored', role: 'ADMIN' } });
    expect(res.status).toBe(200);
    expect(res.body.metadata.bio).toBe('OK');
    expect(res.body.metadata.maliciousField).toBeUndefined();
    expect(res.body.metadata.role).toBeUndefined();
  }, 30000);
});
