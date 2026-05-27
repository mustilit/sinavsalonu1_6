/**
 * PrismaModerationResultRepository unit testleri
 */

jest.mock('../../src/infrastructure/database/prisma', () => ({
  prisma: {
    moderationResult: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { PrismaModerationResultRepository } from '../../src/infrastructure/repositories/PrismaModerationResultRepository';
import { prisma } from '../../src/infrastructure/database/prisma';

const mock = prisma as any;

const makeRecord = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  tenantId: 'tenant-1',
  userId: 'edu-1',
  entityType: 'ExamQuestion',
  entityId: 'q-1',
  provider: 'OPENAI',
  status: 'PENDING',
  score: 0.3,
  categories: [],
  flaggedContent: null,
  reviewerNote: null,
  rawResponse: null,
  createdAt: new Date(),
  reviewedAt: null,
  ...overrides,
});

describe('PrismaModerationResultRepository', () => {
  let repo: PrismaModerationResultRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new PrismaModerationResultRepository();
  });

  describe('create', () => {
    it('kayıt oluşturulur ve döner', async () => {
      mock.moderationResult.create.mockResolvedValue(makeRecord('mr-1'));
      const result = await repo.create({
        tenantId: 'tenant-1',
        userId: 'edu-1',
        entityType: 'ExamQuestion',
        entityId: 'q-1',
        provider: 'OPENAI' as any,
        status: 'PENDING' as any,
      });
      expect(result.id).toBe('mr-1');
      expect(mock.moderationResult.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findById', () => {
    it('kayıt bulunursa döner', async () => {
      mock.moderationResult.findUnique.mockResolvedValue(makeRecord('mr-1'));
      const result = await repo.findById('mr-1');
      expect(result?.id).toBe('mr-1');
    });

    it('kayıt bulunamazsa null döner', async () => {
      mock.moderationResult.findUnique.mockResolvedValue(null);
      const result = await repo.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findByEntity', () => {
    it('entity tipine göre kayıtları döner', async () => {
      mock.moderationResult.findMany.mockResolvedValue([makeRecord('mr-1'), makeRecord('mr-2')]);
      const result = await repo.findByEntity('ExamQuestion', 'q-1');
      expect(result).toHaveLength(2);
      expect(mock.moderationResult.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ entityType: 'ExamQuestion', entityId: 'q-1' }) }),
      );
    });
  });
});
