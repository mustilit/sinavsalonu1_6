export {};
const { bootstrapTestApp, resetDb } = require('../helpers/test-app');

describe('Admin Educators (approve/suspend/unsuspend)', () => {
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

  test('admin approve educator -> 200 and user status/educatorApprovedAt set', async () => {
    const request = require('supertest');
    const admin = await prisma.user.create({
      data: { email: 'admin-ed@example.com', username: 'admined', passwordHash: 'x', role: 'ADMIN' },
    });
    const educator = await prisma.user.create({
      data: {
        email: 'educator-pending@example.com',
        username: 'educpending',
        passwordHash: 'x',
        role: 'EDUCATOR',
        status: 'PENDING_EDUCATOR_APPROVAL',
      },
    });
    const adminToken = jwtService.sign({ sub: admin.id, email: admin.email, role: 'ADMIN' });

    const res = await request(httpServer)
      .post(`/admin/educators/${educator.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(educator.id);
    expect(res.body.status).toBe('ACTIVE');
    expect(res.body.educatorApprovedAt).toBeDefined();

    const updated = await prisma.user.findUnique({ where: { id: educator.id } });
    expect(updated?.status).toBe('ACTIVE');
    expect(updated?.educatorApprovedAt).toBeDefined();
  }, 30000);

  test('candidate cannot approve -> 403', async () => {
    const request = require('supertest');
    const candidate = await prisma.user.create({
      data: { email: 'cand-ed@example.com', username: 'canded', passwordHash: 'x', role: 'CANDIDATE' },
    });
    const educator = await prisma.user.create({
      data: { email: 'ed2@example.com', username: 'ed2', passwordHash: 'x', role: 'EDUCATOR' },
    });
    const candidateToken = jwtService.sign({ sub: candidate.id, email: candidate.email, role: 'CANDIDATE' });

    const res = await request(httpServer)
      .post(`/admin/educators/${educator.id}/approve`)
      .set('Authorization', `Bearer ${candidateToken}`);
    expect(res.status).toBe(403);
  }, 30000);

  test('admin suspend educator -> status SUSPENDED', async () => {
    const request = require('supertest');
    const admin = await prisma.user.create({
      data: { email: 'admin-sus@example.com', username: 'adminsus', passwordHash: 'x', role: 'ADMIN' },
    });
    const educator = await prisma.user.create({
      data: { email: 'ed-sus@example.com', username: 'edsus', passwordHash: 'x', role: 'EDUCATOR' },
    });
    const adminToken = jwtService.sign({ sub: admin.id, email: admin.email, role: 'ADMIN' });

    const res = await request(httpServer)
      .post(`/admin/educators/${educator.id}/suspend`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('SUSPENDED');

    const updated = await prisma.user.findUnique({ where: { id: educator.id } });
    expect(updated?.status).toBe('SUSPENDED');
  }, 30000);

  test('admin unsuspend onaylı educator -> status ACTIVE', async () => {
    const request = require('supertest');
    const admin = await prisma.user.create({
      data: { email: 'admin-unsus@example.com', username: 'adminunsus', passwordHash: 'x', role: 'ADMIN' },
    });
    const educator = await prisma.user.create({
      data: {
        email: 'ed-unsus-approved@example.com',
        username: 'edunsusapp',
        passwordHash: 'x',
        role: 'EDUCATOR',
        status: 'SUSPENDED',
        educatorApprovedAt: new Date(),
      },
    });
    const adminToken = jwtService.sign({ sub: admin.id, email: admin.email, role: 'ADMIN' });

    const res = await request(httpServer)
      .post(`/admin/educators/${educator.id}/unsuspend`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ACTIVE');

    const updated = await prisma.user.findUnique({ where: { id: educator.id } });
    expect(updated?.status).toBe('ACTIVE');
  }, 30000);

  test('admin unsuspend onaysız educator -> status PENDING_EDUCATOR_APPROVAL', async () => {
    const request = require('supertest');
    const admin = await prisma.user.create({
      data: { email: 'admin-unsus2@example.com', username: 'adminunsus2', passwordHash: 'x', role: 'ADMIN' },
    });
    const educator = await prisma.user.create({
      data: {
        email: 'ed-unsus-unapproved@example.com',
        username: 'edunsusunapp',
        passwordHash: 'x',
        role: 'EDUCATOR',
        status: 'SUSPENDED',
        educatorApprovedAt: null,
      },
    });
    const adminToken = jwtService.sign({ sub: admin.id, email: admin.email, role: 'ADMIN' });

    const res = await request(httpServer)
      .post(`/admin/educators/${educator.id}/unsuspend`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PENDING_EDUCATOR_APPROVAL');

    const updated = await prisma.user.findUnique({ where: { id: educator.id } });
    expect(updated?.status).toBe('PENDING_EDUCATOR_APPROVAL');
  }, 30000);

  test('invalid UUID -> 400', async () => {
    const request = require('supertest');
    const admin = await prisma.user.create({
      data: { email: 'admin-uuid@example.com', username: 'adminuuid', passwordHash: 'x', role: 'ADMIN' },
    });
    const adminToken = jwtService.sign({ sub: admin.id, email: admin.email, role: 'ADMIN' });

    const res = await request(httpServer)
      .post('/admin/educators/not-a-uuid/approve')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('INVALID_UUID');
  }, 30000);

  test('approve idempotent: second approve -> 200', async () => {
    const request = require('supertest');
    const admin = await prisma.user.create({
      data: { email: 'admin-idem@example.com', username: 'adminidem', passwordHash: 'x', role: 'ADMIN' },
    });
    const educator = await prisma.user.create({
      data: { email: 'ed-idem@example.com', username: 'edidem', passwordHash: 'x', role: 'EDUCATOR', status: 'PENDING_EDUCATOR_APPROVAL' },
    });
    const adminToken = jwtService.sign({ sub: admin.id, email: admin.email, role: 'ADMIN' });

    const first = await request(httpServer)
      .post(`/admin/educators/${educator.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(first.status).toBe(200);
    const second = await request(httpServer)
      .post(`/admin/educators/${educator.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(second.status).toBe(200);
    expect(second.body.status).toBe('ACTIVE');
  }, 30000);
});
