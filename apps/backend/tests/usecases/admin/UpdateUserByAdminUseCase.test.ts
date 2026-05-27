/**
 * UpdateUserByAdminUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - userId boşsa BAD_REQUEST fırlatır
 * - Kullanıcı bulunamazsa NOT_FOUND fırlatır
 * - Başarı: rol güncelleme dönüşü
 * - Başarı: status güncelleme
 * - educatorApprovedAt güncellenebilir
 */

import { UpdateUserByAdminUseCase } from '../../../src/application/use-cases/admin/UpdateUserByAdminUseCase';

const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1',
  email: 'edu@test.com',
  username: 'edu',
  role: 'EDUCATOR',
  status: 'ACTIVE',
  ...overrides,
});

function makeUserRepo(user: ReturnType<typeof makeUser> | null = makeUser()) {
  return {
    updateByAdmin: jest.fn().mockResolvedValue(user),
    findById: jest.fn().mockResolvedValue(user),
  };
}

describe('UpdateUserByAdminUseCase', () => {
  it('userId boşsa BAD_REQUEST fırlatır', async () => {
    const repo = makeUserRepo();
    const uc = new UpdateUserByAdminUseCase(repo as any);
    await expect(uc.execute('', { role: 'CANDIDATE' })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('kullanıcı bulunamazsa NOT_FOUND fırlatır', async () => {
    const repo = makeUserRepo(null);
    const uc = new UpdateUserByAdminUseCase(repo as any);
    await expect(uc.execute('nonexistent', { role: 'CANDIDATE' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('başarılı güncellemede güncel kullanıcıyı döner', async () => {
    const updated = makeUser({ role: 'CANDIDATE' });
    const repo = {
      updateByAdmin: jest.fn().mockResolvedValue(updated),
    };
    const uc = new UpdateUserByAdminUseCase(repo as any);
    const result = await uc.execute('user-1', { role: 'CANDIDATE' });
    expect(result.role).toBe('CANDIDATE');
  });

  it('status güncellemesi için updateByAdmin doğru input ile çağrılır', async () => {
    const repo = makeUserRepo();
    const uc = new UpdateUserByAdminUseCase(repo as any);
    await uc.execute('user-1', { status: 'SUSPENDED' });
    expect(repo.updateByAdmin).toHaveBeenCalledWith('user-1', { status: 'SUSPENDED' });
  });

  it('educatorApprovedAt Date ile güncellenebilir', async () => {
    const date = new Date('2026-01-01');
    const repo = makeUserRepo(makeUser({ educatorApprovedAt: date }));
    const uc = new UpdateUserByAdminUseCase(repo as any);
    const result = await uc.execute('user-1', { educatorApprovedAt: date });
    expect(result.educatorApprovedAt).toEqual(date);
  });
});
