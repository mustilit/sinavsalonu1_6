/**
 * ReviewsController unit testleri.
 * Controller prisma doğrudan import ettiğinden mock'lanır.
 */

jest.mock('../../src/infrastructure/database/prisma', () => ({
  prisma: {
    examTest: {
      findUnique: jest.fn().mockResolvedValue({ id: 'test-1', packageId: 'pkg-1' }),
    },
    review: {
      findFirst: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({ id: 'rev-1', packageId: 'pkg-1', testRating: 4 }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    purchase: {
      findFirst: jest.fn().mockResolvedValue({ id: 'pur-1', status: 'PAID' }),
    },
  },
}));

const mockCreateUc = jest.fn().mockResolvedValue({ id: 'rev-1', testRating: 4, educatorRating: 5 });
const mockListUc = jest.fn().mockResolvedValue({ items: [], nextCursor: null });
const mockAggUc = jest.fn().mockResolvedValue({ averageRating: 4.5, reviewCount: 10 });

jest.mock('../../src/application/use-cases/review/CreateOrUpdateReviewUseCase', () => ({
  CreateOrUpdateReviewUseCase: jest.fn().mockImplementation(() => ({ execute: mockCreateUc })),
}));
jest.mock('../../src/application/use-cases/review/ListTestReviewsUseCase', () => ({
  ListTestReviewsUseCase: jest.fn().mockImplementation(() => ({ execute: mockListUc })),
}));
jest.mock('../../src/application/use-cases/test/GetTestRatingAggregateUseCase', () => ({
  GetTestRatingAggregateUseCase: jest.fn().mockImplementation(() => ({ execute: mockAggUc })),
}));
jest.mock('../../src/infrastructure/repositories/PrismaReviewRepository', () => ({
  PrismaReviewRepository: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../src/infrastructure/repositories/PrismaPurchaseRepository', () => ({
  PrismaPurchaseRepository: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../src/infrastructure/repositories/PrismaAttemptRepository', () => ({
  PrismaAttemptRepository: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../src/infrastructure/repositories/PrismaAuditLogRepository', () => ({
  PrismaAuditLogRepository: jest.fn().mockImplementation(() => ({})),
}));

import { ReviewsController } from '../../src/nest/controllers/reviews.controller';

describe('ReviewsController', () => {
  let controller: ReviewsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ReviewsController();
  });

  describe('create', () => {
    it('testId üzerinden paketi bulup review oluşturur', async () => {
      const body = { testRating: 4, educatorRating: 5, comment: 'Güzel test' };
      const req = { user: { id: 'cand-1' } };
      const result = await controller.create('test-1', body, req as any);
      expect(mockCreateUc).toHaveBeenCalledWith('pkg-1', 'cand-1', body);
      expect(result).toHaveProperty('id', 'rev-1');
    });

    it('test paket bağlantısı yoksa BadRequestException fırlatır', async () => {
      const { prisma } = require('../../src/infrastructure/database/prisma');
      prisma.examTest.findUnique.mockResolvedValueOnce({ id: 'test-2', packageId: null });
      const body = { testRating: 3 };
      const req = { user: { id: 'cand-1' } };
      await expect(controller.create('test-2', body, req as any)).rejects.toBeDefined();
    });
  });

  describe('list', () => {
    it('testId üzerinden review listesini getirir', async () => {
      await controller.list('test-1', undefined, undefined);
      expect(mockListUc).toHaveBeenCalled();
    });
  });

  describe('agg', () => {
    it('test için puanlama özetini döndürür', async () => {
      const result = await controller.agg('test-1');
      expect(mockAggUc).toHaveBeenCalled();
      expect(result).toHaveProperty('averageRating');
    });
  });
});
