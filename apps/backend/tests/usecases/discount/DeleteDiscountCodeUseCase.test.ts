/**
 * DeleteDiscountCodeUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - User bulunamazsa → USER_NOT_FOUND
 * - CANDIDATE rolü → USER_NOT_AUTHORIZED
 * - Kod bulunamazsa → NOT_FOUND
 * - Başka educator'ın kodu → FORBIDDEN_NOT_OWNER
 * - ADMIN başka educator'ın kodunu silebilir
 * - Başarı: discountCode.delete çağrılır, deleted=true döner
 */

const mockDiscountCodeFindUnique = jest.fn();
const mockDiscountCodeDelete = jest.fn();

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    discountCode: {
      findUnique: (...args: any[]) => mockDiscountCodeFindUnique(...args),
      delete: (...args: any[]) => mockDiscountCodeDelete(...args),
    },
  },
}));

import { DeleteDiscountCodeUseCase } from '../../../src/application/use-cases/discount/DeleteDiscountCodeUseCase';
import { AppError } from '../../../src/application/errors/AppError';

function makeUserRepo(user: any) {
  return { findById: jest.fn().mockResolvedValue(user) };
}

function makeCode(overrides: Record<string, any> = {}) {
  return { id: 'disc-1', code: 'SAVE20', createdById: 'edu-1', ...overrides };
}

describe('DeleteDiscountCodeUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDiscountCodeDelete.mockResolvedValue({});
  });

  it('kullanıcı bulunamazsa USER_NOT_FOUND fırlatır', async () => {
    const userRepo = makeUserRepo(null);
    const uc = new DeleteDiscountCodeUseCase(userRepo as any);
    await expect(uc.execute('edu-missing', 'disc-1')).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
  });

  it('CANDIDATE rolü → USER_NOT_AUTHORIZED fırlatır', async () => {
    const userRepo = makeUserRepo({ id: 'cand-1', role: 'CANDIDATE' });
    const uc = new DeleteDiscountCodeUseCase(userRepo as any);
    await expect(uc.execute('cand-1', 'disc-1')).rejects.toMatchObject({ code: 'USER_NOT_AUTHORIZED' });
  });

  it('kod bulunamazsa NOT_FOUND fırlatır', async () => {
    mockDiscountCodeFindUnique.mockResolvedValue(null);
    const userRepo = makeUserRepo({ id: 'edu-1', role: 'EDUCATOR' });
    const uc = new DeleteDiscountCodeUseCase(userRepo as any);
    await expect(uc.execute('edu-1', 'disc-missing')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('başka educator kodu silemez → FORBIDDEN_NOT_OWNER', async () => {
    mockDiscountCodeFindUnique.mockResolvedValue(makeCode({ createdById: 'edu-original' }));
    const userRepo = makeUserRepo({ id: 'edu-other', role: 'EDUCATOR' });
    const uc = new DeleteDiscountCodeUseCase(userRepo as any);
    await expect(uc.execute('edu-other', 'disc-1')).rejects.toMatchObject({ code: 'FORBIDDEN_NOT_OWNER' });
  });

  it('ADMIN başka educator kodu silebilir', async () => {
    mockDiscountCodeFindUnique.mockResolvedValue(makeCode({ createdById: 'edu-other' }));
    const userRepo = makeUserRepo({ id: 'admin-1', role: 'ADMIN' });
    const uc = new DeleteDiscountCodeUseCase(userRepo as any);
    const result = await uc.execute('admin-1', 'disc-1');
    expect(mockDiscountCodeDelete).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ deleted: true });
  });

  it('başarı: kendi kodunu siler, deleted=true döner', async () => {
    mockDiscountCodeFindUnique.mockResolvedValue(makeCode({ createdById: 'edu-1' }));
    const userRepo = makeUserRepo({ id: 'edu-1', role: 'EDUCATOR' });
    const uc = new DeleteDiscountCodeUseCase(userRepo as any);
    const result = await uc.execute('edu-1', 'disc-1');
    expect(mockDiscountCodeDelete).toHaveBeenCalledWith({ where: { id: 'disc-1' } });
    expect(result).toEqual({ deleted: true });
  });
});
