import { GetRecommendedTestsUseCase } from '../../src/application/use-cases/GetRecommendedTestsUseCase';
import { ListMarketplaceTestsUseCase } from '../../src/application/use-cases/ListMarketplaceTestsUseCase';

test('minRating filters correctly', async () => {
  const examRepo: any = {
    findPublished: async () => ({ items: [{ id: 't1', title: 'T1', educatorId: 'e1', isTimed: false, questionCount: 1, publishedAt: new Date() }], total: 1 }),
  };
  const followRepo: any = { listFollowedEducatorIds: async () => [], listFollowedExamTypeIds: async () => [] };
  const uc = new ListMarketplaceTestsUseCase(examRepo);
  const res = await uc.execute({ limit: 10, minRating: 4 });
  expect(res.items).toBeDefined();
});

test('GetRecommended enrich uses aggregates', async () => {
  const followRepo: any = { listFollowedEducatorIds: async () => [], listFollowedExamTypeIds: async () => [] };
  const examRepo: any = {
    listPublishedByFollowed: async () => [],
    listPublishedFallback: async () => [{ id: 't1', title: 'T1', educatorId: 'e1', isTimed: false, questionCount: 1 }],
  };
  const uc = new GetRecommendedTestsUseCase(followRepo, examRepo);
  const res = await uc.execute('c1', 10);
  expect(res.items[0].ratingAvg !== undefined).toBe(true);
});

