/**
 * ListBlockedTermsUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - Cursor pagination: hasMore ve nextCursor doğru
 * - category filtresi where'e geçer
 * - term substring araması çalışır
 * - limit max 100 sınırlandırılır
 */

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    blockedTerm: { findMany: jest.fn() },
  },
}));

import { ListBlockedTermsUseCase } from '../../../src/application/use-cases/moderation/ListBlockedTermsUseCase';
import { prisma } from '../../../src/infrastructure/database/prisma';

const mockPrisma = prisma as any;

const makeTerm = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  tenantId: 'tenant-1',
  term: 'kötü kelime',
  pattern: null,
  category: 'HATE_SPEECH',
  severity: 'HIGH',
  isActive: true,
  createdBy: 'admin-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

function makeRepo() {
  return {};
}

describe('ListBlockedTermsUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('3 kayıt limit=3 ile nextCursor:null döner', async () => {
    mockPrisma.blockedTerm.findMany.mockResolvedValue(
      Array.from({ length: 3 }, (_, i) => makeTerm(`t-${i}`)),
    );
    const uc = new ListBlockedTermsUseCase(makeRepo() as any);
    const result = await uc.execute({ tenantId: 'tenant-1', limit: 3 });
    expect(result.items).toHaveLength(3);
    expect(result.nextCursor).toBeNull();
  });

  it('limit+1 kayıt geldiğinde nextCursor dolu olur', async () => {
    mockPrisma.blockedTerm.findMany.mockResolvedValue(
      Array.from({ length: 4 }, (_, i) => makeTerm(`t-${i}`)),
    );
    const uc = new ListBlockedTermsUseCase(makeRepo() as any);
    const result = await uc.execute({ tenantId: 'tenant-1', limit: 3 });
    expect(result.items).toHaveLength(3);
    expect(result.nextCursor).toEqual({ id: 't-2' });
  });

  it('category filtresi where kısmına geçer', async () => {
    mockPrisma.blockedTerm.findMany.mockResolvedValue([]);
    const uc = new ListBlockedTermsUseCase(makeRepo() as any);
    await uc.execute({ tenantId: 'tenant-1', category: 'HATE_SPEECH' as any });
    const call = mockPrisma.blockedTerm.findMany.mock.calls[0][0];
    expect(call.where).toMatchObject({ category: 'HATE_SPEECH' });
  });

  it('term arama where kısmına geçer', async () => {
    mockPrisma.blockedTerm.findMany.mockResolvedValue([]);
    const uc = new ListBlockedTermsUseCase(makeRepo() as any);
    await uc.execute({ tenantId: 'tenant-1', term: 'kötü' });
    const call = mockPrisma.blockedTerm.findMany.mock.calls[0][0];
    expect(call.where.term).toMatchObject({ contains: 'kötü', mode: 'insensitive' });
  });

  it('limit 9999 verilse take max 101 sınırlandırılır', async () => {
    mockPrisma.blockedTerm.findMany.mockResolvedValue([]);
    const uc = new ListBlockedTermsUseCase(makeRepo() as any);
    await uc.execute({ tenantId: 'tenant-1', limit: 9999 });
    const call = mockPrisma.blockedTerm.findMany.mock.calls[0][0];
    expect(call.take).toBeLessThanOrEqual(101);
  });
});
