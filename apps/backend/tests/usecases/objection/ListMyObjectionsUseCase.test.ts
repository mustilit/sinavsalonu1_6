/**
 * ListMyObjectionsUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - candidateId undefined ise UNAUTHORIZED fırlatır
 * - Başarılı listede repo.listByReporter çağrılır
 * - Filtre opsiyonları iletilir
 * - Boş liste dönebilir
 */

import { ListMyObjectionsUseCase } from '../../../src/application/use-cases/objection/ListMyObjectionsUseCase';

function makeRepo(result: any[] = []) {
  return { listByReporter: jest.fn().mockResolvedValue(result) };
}

describe('ListMyObjectionsUseCase', () => {
  it('candidateId undefined ise UNAUTHORIZED fırlatır', async () => {
    const repo = makeRepo();
    const uc = new ListMyObjectionsUseCase(repo as any);
    await expect(uc.execute(undefined)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('candidateId geçerli ise listByReporter çağrılır', async () => {
    const objections = [{ id: 'obj-1', reporterId: 'cand-1' }];
    const repo = makeRepo(objections);
    const uc = new ListMyObjectionsUseCase(repo as any);
    const result = await uc.execute('cand-1');
    expect(repo.listByReporter).toHaveBeenCalledWith('cand-1', undefined);
    expect(result).toEqual(objections);
  });

  it('status filtresi repo\'ya iletilir', async () => {
    const repo = makeRepo([]);
    const uc = new ListMyObjectionsUseCase(repo as any);
    await uc.execute('cand-1', { status: 'PENDING' });
    expect(repo.listByReporter).toHaveBeenCalledWith('cand-1', { status: 'PENDING' });
  });

  it('boş liste dönebilir', async () => {
    const repo = makeRepo([]);
    const uc = new ListMyObjectionsUseCase(repo as any);
    const result = await uc.execute('cand-1');
    expect(result).toEqual([]);
  });
});
