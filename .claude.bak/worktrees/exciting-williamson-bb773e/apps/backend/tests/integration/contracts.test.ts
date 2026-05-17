export {};
const { bootstrapTestApp, resetDb } = require('../helpers/test-app');

describe('Contracts (GET active, POST accept)', () => {
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

  test('GET /contracts/active?type=CANDIDATE → 200, id/version/content var', async () => {
    const request = require('supertest');
    const contract = await prisma.contract.create({
      data: {
        type: 'CANDIDATE',
        version: 1,
        title: 'Candidate Terms',
        content: 'Full terms for candidates.',
        isActive: true,
        publishedAt: new Date(),
      },
    });
    const res = await request(httpServer).get('/contracts/active').query({ type: 'CANDIDATE' });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(contract.id);
    expect(res.body.version).toBe(1);
    expect(res.body.content).toBe('Full terms for candidates.');
    expect(res.body.title).toBe('Candidate Terms');
  }, 30000);

  test('POST /contracts/accept without token → 401', async () => {
    const request = require('supertest');
    await prisma.contract.create({
      data: {
        type: 'CANDIDATE',
        version: 1,
        title: 'Terms',
        content: 'Content',
        isActive: true,
        publishedAt: new Date(),
      },
    });
    const res = await request(httpServer)
      .post('/contracts/accept')
      .send({ contractId: '00000000-0000-0000-0000-000000000001' });
    expect(res.status).toBe(401);
  }, 30000);

  test('POST /contracts/accept with inactive contract → 409 CONTRACT_NOT_ACTIVE', async () => {
    const request = require('supertest');
    const candidate = await prisma.user.create({
      data: { email: 'c-contract@example.com', username: 'ccontract', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const inactiveContract = await prisma.contract.create({
      data: {
        type: 'CANDIDATE',
        version: 2,
        title: 'Inactive Terms',
        content: 'Inactive.',
        isActive: false,
        publishedAt: null,
      },
    });
    const token = jwtService.sign({ sub: candidate.id, email: candidate.email, role: 'CANDIDATE' });
    const res = await request(httpServer)
      .post('/contracts/accept')
      .set('Authorization', `Bearer ${token}`)
      .send({ contractId: inactiveContract.id });
    expect(res.status).toBe(409);
    expect(res.body.error?.code).toBe('CONTRACT_NOT_ACTIVE');
  }, 30000);

  test('POST /contracts/accept active contract twice → both 200, single acceptance in DB', async () => {
    const request = require('supertest');
    const candidate = await prisma.user.create({
      data: { email: 'c-twice@example.com', username: 'ctwice', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const contract = await prisma.contract.create({
      data: {
        type: 'CANDIDATE',
        version: 1,
        title: 'Terms',
        content: 'Content',
        isActive: true,
        publishedAt: new Date(),
      },
    });
    const token = jwtService.sign({ sub: candidate.id, email: candidate.email, role: 'CANDIDATE' });

    const res1 = await request(httpServer)
      .post('/contracts/accept')
      .set('Authorization', `Bearer ${token}`)
      .send({ contractId: contract.id });
    expect(res1.status).toBe(200);
    expect(res1.body.acceptedAt).toBeDefined();

    const res2 = await request(httpServer)
      .post('/contracts/accept')
      .set('Authorization', `Bearer ${token}`)
      .send({ contractId: contract.id });
    expect(res2.status).toBe(200);
    expect(res2.body.acceptedAt).toBeDefined();

    const acceptances = await prisma.contractAcceptance.findMany({
      where: { userId: candidate.id, contractId: contract.id },
    });
    expect(acceptances.length).toBe(1);
  }, 30000);
});
