import { CreateOrUpdateReviewUseCase } from '../../src/application/use-cases/CreateOrUpdateReviewUseCase';

test('cannot create review without purchase', async () => {
  const reviewRepo: any = { upsertReview: async () => null };
  const purchaseRepo: any = { hasPurchase: async () => false };
  const attemptRepo: any = { hasSubmittedAttempt: async () => true };
  const auditRepo: any = { create: async () => null };
  const uc = new CreateOrUpdateReviewUseCase(reviewRepo, purchaseRepo, attemptRepo, auditRepo);
  await expect(uc.execute('t1', 'c1', { testRating: 4 })).rejects.toThrow();
});

test('cannot create review without submitted attempt', async () => {
  const reviewRepo: any = { upsertReview: async () => null };
  const purchaseRepo: any = { hasPurchase: async () => true };
  const attemptRepo: any = { hasSubmittedAttempt: async () => false };
  const auditRepo: any = { create: async () => null };
  const uc = new CreateOrUpdateReviewUseCase(reviewRepo, purchaseRepo, attemptRepo, auditRepo);
  await expect(uc.execute('t1', 'c1', { testRating: 5 })).rejects.toThrow();
});

test('upsert review works', async () => {
  const created = { id: 'r1', testId: 't1', candidateId: 'c1', testRating: 5 };
  const reviewRepo: any = { upsertReview: async () => created };
  const purchaseRepo: any = { hasPurchase: async () => true };
  const attemptRepo: any = { hasSubmittedAttempt: async () => true };
  const auditRepo: any = { create: async () => null };
  const uc = new CreateOrUpdateReviewUseCase(reviewRepo, purchaseRepo, attemptRepo, auditRepo);
  const res = await uc.execute('t1', 'c1', { testRating: 5 });
  expect(res).toEqual(created);
});

