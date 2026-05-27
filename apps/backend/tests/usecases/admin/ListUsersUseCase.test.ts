/**
 * ListUsersUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - Parametresiz çağrıda userRepo.list çağrılır
 * - q filtresi ile çağrılabilir
 * - role filtresi ile çağrılabilir
 * - repo hatası LIST_USERS_FAILED olarak sarmalanır
 */

jest.mock('../../../src/common/tenantContext', () => ({
  runWithoutTenantFilter: jest.fn().mockImplementation((fn: () => any) => fn()),
}));

import { ListUsersUseCase } from '../../../src/application/use-cases/admin/ListUsersUseCase';

function makeUserRepo(result: any[] = []) {
  return { list: jest.fn().mockResolvedValue(result) };
}

describe('ListUsersUseCase', () => {
  it('parametresiz çağrıda userRepo.list çağrılır', async () => {
    const repo = makeUserRepo([{ id: 'u-1' }, { id: 'u-2' }]);
    const uc = new ListUsersUseCase(repo as any);
    const result = await uc.execute();
    expect(repo.list).toHaveBeenCalled();
    expect(result).toHaveLength(2);
  });

  it('q filtresi repo\'ya iletilir', async () => {
    const repo = makeUserRepo([]);
    const uc = new ListUsersUseCase(repo as any);
    await uc.execute({ q: 'mehmet' });
    expect(repo.list).toHaveBeenCalledWith(expect.objectContaining({ q: 'mehmet' }));
  });

  it('role filtresi repo\'ya iletilir', async () => {
    const repo = makeUserRepo([]);
    const uc = new ListUsersUseCase(repo as any);
    await uc.execute({ role: 'EDUCATOR' });
    expect(repo.list).toHaveBeenCalledWith(expect.objectContaining({ role: 'EDUCATOR' }));
  });

  it('repo hatası LIST_USERS_FAILED olarak sarmalanır', async () => {
    const repo = { list: jest.fn().mockRejectedValue(new Error('DB error')) };
    const uc = new ListUsersUseCase(repo as any);
    await expect(uc.execute()).rejects.toMatchObject({ code: 'LIST_USERS_FAILED' });
  });
});
