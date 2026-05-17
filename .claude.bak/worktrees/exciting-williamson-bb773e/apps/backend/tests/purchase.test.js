const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const jwt = require('jsonwebtoken');

describe('Purchase flow', () => {
  test('purchase creates purchase, attempt, audit', async () => {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // create candidate user
    const candidate = await prisma.user.create({
      data: { email: `cand_${Date.now()}@example.com`, username: `cand_${Date.now()}`, passwordHash: 'x', role: 'CANDIDATE', status: 'ACTIVE' },
    });
    // create educator
    const educator = await prisma.user.create({
      data: { email: `edu_${Date.now()}@example.com`, username: `edu_${Date.now()}`, passwordHash: 'x', role: 'EDUCATOR', status: 'ACTIVE' },
    });
    // create test
    const test = await prisma.examTest.create({
      data: { title: 'Smoke Test', isTimed: false, status: 'PUBLISHED', price: 10, educatorId: educator.id },
    });

    // sign token for candidate
    const token = jwt.sign({ sub: candidate.id, email: candidate.email, role: 'CANDIDATE' }, process.env.JWT_SECRET || 'super_secret_key');

    // perform purchase
    const res = await fetch(`http://localhost:3000/purchases/${test.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount: 10 }),
    });
    expect([200,201]).toContain(res.status);

    // check purchase in db
    const purchase = await prisma.purchase.findUnique({ where: { testId_candidateId: { testId: test.id, candidateId: candidate.id } } });
    expect(purchase).toBeTruthy();

    const attempt = await prisma.testAttempt.findUnique({ where: { testId_candidateId: { testId: test.id, candidateId: candidate.id } } });
    expect(attempt).toBeTruthy();

    const audit = await prisma.auditLog.findFirst({ where: { entityId: purchase.id, action: 'PURCHASE' } });
    expect(audit).toBeTruthy();

    await prisma.$disconnect();
  }, 30000);
});

