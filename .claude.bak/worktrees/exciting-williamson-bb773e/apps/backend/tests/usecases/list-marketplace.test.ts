import { InMemoryExamRepository } from '../../src/infrastructure/repositories/InMemoryExamRepository';
import { ListMarketplaceTestsUseCase } from '../../src/application/use-cases/ListMarketplaceTestsUseCase';

describe('ListMarketplaceTestsUseCase', () => {
  it('filters by examTypeId and pagination', async () => {
    const repo = new InMemoryExamRepository();
    // seed some tests
    await repo.save(
      { id: 't1', title: 'T1', isTimed: false, duration: null, status: 'PUBLISHED', metadata: {}, createdAt: new Date(), updatedAt: new Date() } as any,
      []
    );
    await repo.save(
      { id: 't2', title: 'T2', isTimed: true, duration: 30, status: 'PUBLISHED', metadata: {}, createdAt: new Date(), updatedAt: new Date(), examTypeId: 'et1' } as any,
      []
    );

    const uc = new ListMarketplaceTestsUseCase(repo);
    const result = await uc.execute({ examTypeId: 'et1', page: 1, limit: 10 });
    expect(result.total).toBeGreaterThanOrEqual(1);
    expect(result.items.some((i) => (i as any).examTypeId === 'et1')).toBe(true);
  });
});

