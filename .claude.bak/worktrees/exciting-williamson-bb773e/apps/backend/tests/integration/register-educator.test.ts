export {};
const { bootstrapTestApp, resetDb } = require('../helpers/test-app');

describe('Register educator (FR-E-01)', () => {
  let app: any, prisma: any, httpServer: any;

  beforeAll(async () => {
    const boot = await bootstrapTestApp();
    app = boot.app;
    prisma = boot.prisma;
    httpServer = boot.httpServer;
  }, 30000);

  afterAll(async () => {
    if (app) await app.close();
    if (prisma) await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDb(prisma);
  });

  test('POST /auth/register/educator with active contract -> 201, user EDUCATOR + PENDING_EDUCATOR_APPROVAL', async () => {
    const request = require('supertest');
    await prisma.contract.create({
      data: {
        type: 'EDUCATOR',
        version: 1,
        title: 'Educator Agreement',
        content: 'Terms for educators.',
        isActive: true,
        publishedAt: new Date(),
      },
    });

    const res = await request(httpServer)
      .post('/auth/register/educator')
      .send({ email: 'edu-new@example.com', username: 'edunew', password: 'SecurePass123!' });
    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.role).toBe('EDUCATOR');
    expect(res.body.user.status).toBe('PENDING_EDUCATOR_APPROVAL');
    expect(res.body.user.email).toBe('edu-new@example.com');
    expect(res.body.token).toBeDefined();

    const user = await prisma.user.findUnique({ where: { email: 'edu-new@example.com' } });
    expect(user).toBeDefined();
    expect(user.role).toBe('EDUCATOR');
    expect(user.status).toBe('PENDING_EDUCATOR_APPROVAL');

    const acceptance = await prisma.contractAcceptance.findFirst({
      where: { userId: user.id },
    });
    expect(acceptance).toBeDefined();
  }, 30000);

  test('POST /auth/register/educator without active contract -> 400', async () => {
    const request = require('supertest');
    await prisma.contract.create({
      data: {
        type: 'EDUCATOR',
        version: 1,
        title: 'Inactive',
        content: 'Inactive.',
        isActive: false,
        publishedAt: null,
      },
    });

    const res = await request(httpServer)
      .post('/auth/register/educator')
      .send({ email: 'edu-no-contract@example.com', username: 'edunoc', password: 'SecurePass123!' });
    expect(res.status).toBe(400);
  }, 30000);

  test('POST /auth/register/educator duplicate email -> 409', async () => {
    const request = require('supertest');
    await prisma.contract.create({
      data: {
        type: 'EDUCATOR',
        version: 1,
        title: 'Educator Terms',
        content: 'Content',
        isActive: true,
        publishedAt: new Date(),
      },
    });
    await prisma.user.create({
      data: { email: 'edu-dup@example.com', username: 'edudup', passwordHash: 'x', role: 'EDUCATOR' },
    });

    const res = await request(httpServer)
      .post('/auth/register/educator')
      .send({ email: 'edu-dup@example.com', username: 'edudup2', password: 'SecurePass123!' });
    expect(res.status).toBe(409);
  }, 30000);
});
