/**
 * ListAllDiscountCodesUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - Kullanıcı bulunamazsa USER_NOT_FOUND fırlatır
 * - ADMIN değilse USER_NOT_ADMIN fırlatır
 * - Başarılı listede creator bilgisiyle birlikte döner
 * - isActive null değeri true'ya normalize edilir
 */

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

import { ListAllDiscountCodesUseCase } from '../../../src/application/use-cases/discount/ListAllDiscountCodesUseCase';
import { prisma } from '../../../src/infrastructure/database/prisma';

const mockPrisma = prisma as any;

const makeUserRepo = (user: Record<string, unknown> | null) => ({
  findById: jest.fn().mockResolvedValue(user),
});

const makeCodeRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'code-1',
  code: 'SAVE10',
  percentOff: 10,
  maxUses: 100,
  usedCount: 5,
  isActive: true,
  validFrom: null,
  validUntil: null,
  description: null,
  createdAt: new Date(),
  createdById: 'edu-1',
  creatorUsername: 'educator1',
  creatorEmail: 'edu@test.com',
  creatorRole: 'EDUCATOR',
  ...overrides,
});

describe('ListAllDiscountCodesUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('kullanıcı bulunamazsa USER_NOT_FOUND fırlatır', async () => {
    const userRepo = makeUserRepo(null);
    const uc = new ListAllDiscountCodesUseCase(userRepo as any);
    await expect(uc.execute('nonexistent')).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
  });

  it('ADMIN değilse USER_NOT_ADMIN fırlatır', async () => {
    const userRepo = makeUserRepo({ id: 'edu-1', role: 'EDUCATOR' });
    const uc = new ListAllDiscountCodesUseCase(userRepo as any);
    await expect(uc.execute('edu-1')).rejects.toMatchObject({ code: 'USER_NOT_ADMIN' });
  });

  it('admin ise $queryRaw çağrılır ve kodlar döner', async () => {
    const userRepo = makeUserRepo({ id: 'admin-1', role: 'ADMIN' });
    mockPrisma.$queryRaw.mockResolvedValue([makeCodeRow()]);
    const uc = new ListAllDiscountCodesUseCase(userRepo as any);
    const result = await uc.execute('admin-1');
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('SAVE10');
    expect(result[0].creatorUsername).toBe('educator1');
  });

  it('isActive null değeri true\'ya normalize edilir', async () => {
    const userRepo = makeUserRepo({ id: 'admin-1', role: 'ADMIN' });
    mockPrisma.$queryRaw.mockResolvedValue([makeCodeRow({ isActive: null })]);
    const uc = new ListAllDiscountCodesUseCase(userRepo as any);
    const result = await uc.execute('admin-1');
    expect(result[0].isActive).toBe(true);
  });

  it('birden fazla kod listede yer alır', async () => {
    const userRepo = makeUserRepo({ id: 'admin-1', role: 'ADMIN' });
    mockPrisma.$queryRaw.mockResolvedValue([
      makeCodeRow({ id: 'code-1', code: 'SAVE10' }),
      makeCodeRow({ id: 'code-2', code: 'SAVE20' }),
    ]);
    const uc = new ListAllDiscountCodesUseCase(userRepo as any);
    const result = await uc.execute('admin-1');
    expect(result).toHaveLength(2);
  });
});
