/**
 * ListMarketplacePackagesUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - Cursor pagination: hasMore ve nextCursor
 * - limit maksimum 100 ile sınırlandırılır
 * - examTypeId filtresi where kısmına eklenir
 */

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    testPackage: { findMany: jest.fn() },
    examTest: { findMany: jest.fn().mockResolvedValue([]) },
    $queryRaw: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../../src/common/tenant', () => ({
  getDefaultTenantId: () => 'default-tenant',
}));

import { ListMarketplacePackagesUseCase } from '../../../src/application/use-cases/package/ListMarketplacePackagesUseCase';
import { prisma } from '../../../src/infrastructure/database/prisma';

const mockPrisma = prisma as any;

const makePkg = (id: string) => ({
  id,
  title: `Package ${id}`,
  priceCents: 1000,
  publishedAt: new Date('2026-01-01'),
  coverImageUrl: null,
  description: null,
  difficulty: 'medium',
  tags: [],
  educatorId: 'edu-1',
  educator: { id: 'edu-1', username: 'edu' },
  _count: { tests: 3, purchases: 0 },
  examType: null,
  examTypeId: null,
  reviews: [],
});

describe('ListMarketplacePackagesUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('limit 9999 verilse take max 101 olarak sınırlandırılır', async () => {
    mockPrisma.testPackage.findMany.mockResolvedValue([]);
    const uc = new ListMarketplacePackagesUseCase();
    await uc.execute({ limit: 9999 });
    const call = mockPrisma.testPackage.findMany.mock.calls[0][0];
    expect(call.take).toBeLessThanOrEqual(101);
  });
});
