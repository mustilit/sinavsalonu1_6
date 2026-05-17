import { GetRecommendedTestsUseCase } from '../../src/application/use-cases/GetRecommendedTestsUseCase';

test('no follows -> fallback only', async () => {
  const followRepo: any = { listFollowedEducatorIds: async () => [], listFollowedExamTypeIds: async () => [] };
  const examRepo: any = {
    listPublishedByFollowed: async () => [],
    listPublishedFallback: async () => [{ id: 't1', title: 'T1', educatorId: 'e1', isTimed: false, questionCount: 1 }],
  };
  const uc = new GetRecommendedTestsUseCase(followRepo, examRepo);
  const res = await uc.execute('c1', 10);
  expect(res.items.length).toBeGreaterThanOrEqual(1);
  expect(res.items[0].tags).toContain('POPULAR');
});

test('educator follow -> followed boosted', async () => {
  const followRepo: any = { listFollowedEducatorIds: async () => ['e1'], listFollowedExamTypeIds: async () => [] };
  const examRepo: any = {
    listPublishedByFollowed: async () => [{ id: 't2', title: 'T2', educatorId: 'e1', isTimed: false, questionCount: 1 }],
    listPublishedFallback: async () => [{ id: 't3', title: 'T3', educatorId: 'e2', isTimed: false, questionCount: 1 }],
  };
  const uc = new GetRecommendedTestsUseCase(followRepo, examRepo);
  const res = await uc.execute('c1', 10);
  expect(res.items[0].tags).toContain('FOLLOWED_EDUCATOR');
});

test('examType follow -> followed examType boosted', async () => {
  const followRepo: any = { listFollowedEducatorIds: async () => [], listFollowedExamTypeIds: async () => ['et1'] };
  const examRepo: any = {
    listPublishedByFollowed: async () => [{ id: 't4', title: 'T4', educatorId: 'e3', examTypeId: 'et1', isTimed: false, questionCount: 1 }],
    listPublishedFallback: async () => [],
  };
  const uc = new GetRecommendedTestsUseCase(followRepo, examRepo);
  const res = await uc.execute('c1', 10);
  expect(res.items[0].tags).toContain('FOLLOWED_EXAMTYPE');
});

test('dedupe when both follow types include same test', async () => {
  const followRepo: any = { listFollowedEducatorIds: async () => ['e1'], listFollowedExamTypeIds: async () => ['et1'] };
  const t = { id: 't5', title: 'T5', educatorId: 'e1', examTypeId: 'et1', isTimed: false, questionCount: 1 };
  const examRepo: any = {
    listPublishedByFollowed: async () => [t],
    listPublishedFallback: async () => [],
  };
  const uc = new GetRecommendedTestsUseCase(followRepo, examRepo);
  const res = await uc.execute('c1', 10);
  expect(res.items.length).toBe(1);
  expect(res.items[0].tags).toEqual(expect.arrayContaining(['FOLLOWED_EDUCATOR','FOLLOWED_EXAMTYPE']));
});

import { GetRecommendedTestsUseCase } from '../../src/application/use-cases/GetRecommendedTestsUseCase';

test('fallback only when no follows', async () => {
  const examRepo: any = {
    listPublishedByFollowed: async () => [],
    listPublishedFallback: async () => [{ id: 't1', title: 'T1' }],
  };
  const followRepo: any = { listFollowedEducatorIds: async () => [], listFollowedExamTypeIds: async () => [] };
  const uc = new GetRecommendedTestsUseCase(examRepo, followRepo);
  const res = await uc.execute('c1', 10);
  expect(res.items.length).toBeGreaterThanOrEqual(1);
});

test('limit respected and dedupe', async () => {
  const examRepo: any = {
    listPublishedByFollowed: async () => [{ id: 't1', title: 'T1' }, { id: 't2', title: 'T2' }],
    listPublishedFallback: async () => [{ id: 't2', title: 'T2' }, { id: 't3', title: 'T3' }],
  };
  const followRepo: any = { listFollowedEducatorIds: async () => [], listFollowedExamTypeIds: async () => [] };
  const uc = new GetRecommendedTestsUseCase(examRepo, followRepo);
  const res = await uc.execute('c1', 2);
  expect(res.items.length).toBe(2);
  const ids = res.items.map((i: any) => i.id);
  expect(new Set(ids).size).toBe(ids.length);
});

