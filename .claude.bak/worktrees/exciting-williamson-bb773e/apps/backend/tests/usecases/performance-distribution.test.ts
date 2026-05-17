import { GetPerformanceDistributionUseCase } from '../../src/application/use-cases/GetPerformanceDistributionUseCase';

test('returns limited when participants <5', async () => {
  const attemptRepo: any = {
    countSubmittedByTest: async () => 3,
    groupScoresByTest: async () => [],
    findLatestSubmittedAttempt: async () => ({ id: 'a1', score: 1 }),
    findAttemptById: async () => ({ id: 'a1', candidateId: 'c1', score: 1 }),
  };
  const uc = new GetPerformanceDistributionUseCase(attemptRepo);
  const res = await uc.execute('t1', 'c1');
  expect(res.message).toBe('Not enough data');
});

test('computes histogram and percentiles', async () => {
  const attemptRepo: any = {
    countSubmittedByTest: async () => 10,
    groupScoresByTest: async () => [{ score: 0, count: 2 }, { score: 1, count: 3 }, { score: 2, count: 5 }, { score: 999, count: 1 }, { score: -1, count: 1 }, { score: null, count: 1 }],
    findLatestSubmittedAttempt: async () => ({ id: 'a1', score: 1 }),
    findAttemptById: async () => ({ id: 'a1', candidateId: 'c1', score: 1 }),
  };
  const uc = new GetPerformanceDistributionUseCase(attemptRepo);
  const res = await uc.execute('t1', 'c1');
  expect(res.histogram).toBeDefined();
  expect(res.stats).toBeDefined();
  expect(res.my).toBeDefined();
  expect(res.my.percentile).toBeGreaterThanOrEqual(0);
});

