/**
 * ListEducatorDiscountCodesUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - Kullanıcı bulunamazsa USER_NOT_FOUND fırlatır
 * - EDUCATOR değilse USER_NOT_EDUCATOR fırlatır
 * - SUSPENDED eğitici EDUCATOR_SUSPENDED fırlatır
 * - Başarılı listede $queryRaw sonuçları döner
 * - isActive null → true normalize edilir
 */

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

import { ListEducatorDiscountCodesUseCase } from '../../../src/application/use-cases/discount/ListEducatorDiscountCodesUseCase';
import { prisma } from '../../../src/infrastructure/database/prisma';

const mockPrisma = prisma as any;

const makeUserRepo = (user: Record<string, unknown> | null) => ({
  findById: jest.fn().mockResolvedValue(user),
});

describe('ListEducatorDiscountCodesUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('kullanıcı bulunamazsa USER_NOT_FOUND fırlatır', async () => {
    const repo = makeUserRepo(null);
    const uc = new ListEducatorDiscountCodesUseCase(repo as any);
    await expect(uc.execute('nonexistent')).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
  });

  it('EDUCATOR değilse USER_NOT_EDUCATOR fırlatır', async () => {
    const repo = makeUserRepo({ id: 'cand-1', role: 'CANDIDATE', status: 'ACTIVE' });
    const uc = new ListEducatorDiscountCodesUseCase(repo as any);
    await expect(uc.execute('cand-1')).rejects.toMatchObject({ code: 'USER_NOT_EDUCATOR' });
  });

  it('SUSPENDED eğitici EDUCATOR_SUSPENDED fırlatır', async () => {
    const repo = makeUserRepo({ id: 'edu-1', role: 'EDUCATOR', status: 'SUSPENDED' });
    const uc = new ListEducatorDiscountCodesUseCase(repo as any);
    await expect(uc.execute('edu-1')).rejects.toMatchObject({ code: 'EDUCATOR_SUSPENDED' });
  });

  it('aktif eğitici için kodlar dönülür', async () => {
    const repo = makeUserRepo({ id: 'edu-1', role: 'EDUCATOR', status: 'ACTIVE' });
    mockPrisma.$queryRaw.mockResolvedValue([
      {
        id: 'code-1', code: 'SAVE10', percentOff: 10, maxUses: 50,
        usedCount: 3, isActive: true, validFrom: null, validUntil: null,
        description: null, createdAt: new Date(),
      },
    ]);
    const uc = new ListEducatorDiscountCodesUseCase(repo as any);
    const result = await uc.execute('edu-1');
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('SAVE10');
  });

  it('isActive null ise true döner', async () => {
    const repo = makeUserRepo({ id: 'edu-1', role: 'EDUCATOR', status: 'ACTIVE' });
    mockPrisma.$queryRaw.mockResolvedValue([
      {
        id: 'code-1', code: 'OLD', percentOff: 5, maxUses: null,
        usedCount: 0, isActive: null, validFrom: null, validUntil: null,
        description: null, createdAt: new Date(),
      },
    ]);
    const uc = new ListEducatorDiscountCodesUseCase(repo as any);
    const result = await uc.execute('edu-1');
    expect(result[0].isActive).toBe(true);
  });
});
