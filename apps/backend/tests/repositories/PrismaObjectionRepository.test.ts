/**
 * PrismaObjectionRepository unit testleri
 */

jest.mock('../../src/infrastructure/database/prisma', () => ({
  prisma: {
    objection: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

import { PrismaObjectionRepository } from '../../src/infrastructure/repositories/PrismaObjectionRepository';
import { prisma } from '../../src/infrastructure/database/prisma';

const mock = prisma as any;

const makeRow = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  attemptId: 'att-1',
  questionId: 'q-1',
  reporterId: 'cand-1',
  reason: 'Soru yanlış',
  status: 'PENDING',
  answerText: null,
  answeredAt: null,
  escalatedAt: null,
  adminAnswerText: null,
  adminAnsweredAt: null,
  adminAnswererId: null,
  createdAt: new Date(),
  attempt: { test: { id: 'test-1', title: 'Test 1', educatorId: 'edu-1', educator: { username: 'edu' } } },
  question: { content: 'Soru içeriği' },
  reporter: { username: 'cand', email: 'cand@test.com' },
  adminAnswerer: null,
  ...overrides,
});

describe('PrismaObjectionRepository', () => {
  let repo: PrismaObjectionRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new PrismaObjectionRepository();
  });

  describe('create', () => {
    it('itiraz oluşturulur ve Objection döner', async () => {
      mock.objection.create.mockResolvedValue(makeRow('obj-1'));
      const result = await repo.create({
        attemptId: 'att-1',
        questionId: 'q-1',
        reporterId: 'cand-1',
        reason: 'Soru yanlış',
      });
      expect(result.id).toBe('obj-1');
      expect(result.status).toBe('PENDING');
    });
  });

  describe('findById', () => {
    it('kayıt bulunursa Objection döner', async () => {
      mock.objection.findUnique.mockResolvedValue(makeRow('obj-1'));
      const result = await repo.findById('obj-1');
      expect(result?.id).toBe('obj-1');
    });

    it('kayıt bulunamazsa null döner', async () => {
      mock.objection.findUnique.mockResolvedValue(null);
      const result = await repo.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('listByReporter', () => {
    it('raporlayıcıya ait itirazları döner', async () => {
      mock.objection.findMany.mockResolvedValue([makeRow('obj-1'), makeRow('obj-2')]);
      const result = await repo.listByReporter('cand-1');
      expect(result).toHaveLength(2);
    });

    it('status filtresi uygulanabilir', async () => {
      mock.objection.findMany.mockResolvedValue([makeRow('obj-1', { status: 'RESOLVED' })]);
      const result = await repo.listByReporter('cand-1', { status: 'RESOLVED' });
      expect(result[0].status).toBe('RESOLVED');
    });
  });

  describe('escalate', () => {
    it('tekil itiraz ESCALATED durumuna alınır', async () => {
      const escalatedRow = makeRow('obj-1', { status: 'ESCALATED', escalatedAt: new Date() });
      mock.objection.updateMany.mockResolvedValue({ count: 1 });
      mock.objection.findUnique.mockResolvedValue(escalatedRow);
      const result = await repo.escalate('obj-1', { status: 'ESCALATED', escalatedAt: new Date() });
      expect(result?.status).toBe('ESCALATED');
    });

    it('itiraz bulunamazsa null döner', async () => {
      mock.objection.updateMany.mockResolvedValue({ count: 0 });
      const result = await repo.escalate('nonexistent', { status: 'ESCALATED', escalatedAt: new Date() });
      expect(result).toBeNull();
    });
  });
});
