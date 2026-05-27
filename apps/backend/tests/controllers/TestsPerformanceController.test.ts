/**
 * TestsPerformanceController unit testleri.
 * PrismaAttemptRepository kullanıldığından prisma mock'lanır.
 */

jest.mock('../../src/infrastructure/database/prisma', () => ({
  prisma: { attempt: { findMany: jest.fn() } },
}));

jest.mock('../../src/infrastructure/repositories/PrismaAttemptRepository', () => ({
  PrismaAttemptRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../src/application/use-cases/test/GetPerformanceDistributionUseCase', () => ({
  GetPerformanceDistributionUseCase: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue({
      distribution: [{ scoreRange: '80-100', count: 5, percent: 50 }],
      candidatePercentile: 75,
    }),
  })),
}));

import { TestsPerformanceController } from '../../src/nest/controllers/tests.performance.controller';

describe('TestsPerformanceController', () => {
  let controller: TestsPerformanceController;

  beforeEach(() => {
    controller = new TestsPerformanceController();
  });

  describe('performance', () => {
    it('testId, candidateId ve attemptId ile dağılımı döndürür', async () => {
      const q = { attemptId: 'att-1' } as any;
      const req = { user: { id: 'cand-1' } };
      const result = await controller.performance('test-1', q, req as any);
      expect(result).toHaveProperty('distribution');
      expect(result).toHaveProperty('candidatePercentile');
    });

    it('attemptId olmadan da çalışır', async () => {
      const q = {} as any;
      const req = { user: { id: 'cand-1' } };
      const result = await controller.performance('test-1', q, req as any);
      expect(result).toHaveProperty('distribution');
    });
  });
});
