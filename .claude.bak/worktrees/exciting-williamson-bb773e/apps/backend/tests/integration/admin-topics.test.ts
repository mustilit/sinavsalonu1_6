export {};
const { bootstrapTestApp, resetDb } = require('../helpers/test-app');

describe('Admin Topics integration', () => {
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

  test('admin can create topic and list; candidate gets 403', async () => {
    const request = require('supertest');
    const admin = await prisma.user.create({
      data: { email: 'admin-topics@example.com', username: 'admintopics', passwordHash: 'x', role: 'ADMIN' },
    });
    const examType = await prisma.examType.create({
      data: { name: 'Test Exam', slug: 'test-exam-' + Date.now(), active: true },
    });
    const adminToken = jwtService.sign({ sub: admin.id, email: admin.email, role: 'ADMIN' });

    const createRes = await request(httpServer)
      .post('/admin/topics')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ examTypeId: examType.id, name: 'Matematik Konu' });
    expect(createRes.status).toBe(201);
    expect(createRes.body.id).toBeDefined();
    expect(createRes.body.name).toBe('Matematik Konu');
    expect(createRes.body.examTypeId).toBe(examType.id);

    const candidate = await prisma.user.create({
      data: { email: 'cand-topics@example.com', username: 'candtopics', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const candidateToken = jwtService.sign({ sub: candidate.id, email: candidate.email, role: 'CANDIDATE' });
    const forbidden = await request(httpServer)
      .post('/admin/topics')
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({ examTypeId: examType.id, name: 'Other' });
    expect(forbidden.status).toBe(403);

    const listRes = await request(httpServer)
      .get(`/admin/topics?examTypeId=${examType.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    const found = listRes.body.find((t: any) => t.name === 'Matematik Konu');
    expect(found).toBeDefined();
    expect(found.id).toBe(createRes.body.id);
  }, 30000);
});
