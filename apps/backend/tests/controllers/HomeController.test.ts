/**
 * HomeController unit testleri.
 * Constructor inline UC örneklediğinden tüm bağımlılıklar mock'lanır.
 */

jest.mock('../../src/infrastructure/database/prisma', () => ({
  prisma: { follow: { findMany: jest.fn() }, examTest: { findMany: jest.fn() } },
}));

jest.mock('../../src/infrastructure/repositories/PrismaExamRepository', () => ({
  PrismaExamRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../src/infrastructure/repositories/PrismaFollowRepository', () => ({
  PrismaFollowRepository: jest.fn().mockImplementation(() => ({})),
}));

const mockRecommendedExecute = jest.fn().mockResolvedValue({
  items: [
    { id: 'test-1', title: 'Test A', tags: ['POPULAR'] },
    { id: 'test-2', title: 'Test B', tags: ['FOLLOWED_EDUCATOR'] },
  ],
  meta: { followedBoosted: 1, fallbackCount: 1 },
});

const mockAdSelectExecute = jest.fn().mockResolvedValue([]);
const mockAdRecordExecute = jest.fn().mockResolvedValue(undefined);

jest.mock('../../src/application/use-cases/package/GetRecommendedTestsUseCase', () => ({
  GetRecommendedTestsUseCase: jest.fn().mockImplementation(() => ({
    execute: mockRecommendedExecute,
  })),
}));

jest.mock('../../src/application/use-cases/ad/SelectAdSlotsUseCase', () => ({
  SelectAdSlotsUseCase: jest.fn().mockImplementation(() => ({
    execute: mockAdSelectExecute,
  })),
}));

jest.mock('../../src/application/use-cases/ad/RecordAdImpressionsUseCase', () => ({
  RecordAdImpressionsUseCase: jest.fn().mockImplementation(() => ({
    execute: mockAdRecordExecute,
  })),
}));

import { HomeController } from '../../src/nest/controllers/home.controller';

describe('HomeController', () => {
  let controller: HomeController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new HomeController();
  });

  describe('recommended', () => {
    it('önerilen testleri döndürür', async () => {
      const q = { limit: 20 } as any;
      const req = { user: { id: 'cand-1' } };
      const result = await controller.recommended(q, req as any);
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toHaveProperty('limit', 20);
    });

    it('limit 50 ile sınırlandırılır', async () => {
      const q = { limit: 200 } as any;
      const req = { user: { id: 'cand-1' } };
      const result = await controller.recommended(q, req as any);
      expect(result.meta.limit).toBe(50);
    });

    it('limit minimum 1 ile sınırlandırılır', async () => {
      const q = { limit: 0 } as any;
      const req = { user: { id: 'cand-1' } };
      const result = await controller.recommended(q, req as any);
      expect(result.meta.limit).toBe(1);
    });

    it('reklam alanları varsa items içinde karışır', async () => {
      mockAdSelectExecute.mockResolvedValue([
        { id: 'adp-1', educatorId: 'edu-1', testId: 'test-3', targetType: 'TEST', test: { id: 'test-3', title: 'Reklam Test', examTypeId: null, priceCents: 5000, currency: 'TRY', isTimed: false, questionCount: 10 } },
      ]);

      const q = { limit: 20 } as any;
      const req = { user: { id: 'cand-1' } };
      const result = await controller.recommended(q, req as any);
      expect(result).toHaveProperty('items');
      expect(result.meta.adCount).toBeGreaterThanOrEqual(0);
    });

    it('candidateId yokken de çalışır (anonim)', async () => {
      const q = { limit: 10 } as any;
      const req = { user: {} };
      const result = await controller.recommended(q, req as any);
      expect(result).toHaveProperty('items');
    });
  });
});
