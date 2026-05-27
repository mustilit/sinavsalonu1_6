/**
 * ListAllObjectionsUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - Filtre olmadan tüm itirazlar listelenir
 * - Status filtresi iletilir
 * - Tarih aralığı filtresi iletilir
 * - Boş sonuç dönebilir
 */

import { ListAllObjectionsUseCase } from '../../../src/application/use-cases/objection/ListAllObjectionsUseCase';

function makeRepo(result: any[] = []) {
  return { listAll: jest.fn().mockResolvedValue(result) };
}

describe('ListAllObjectionsUseCase', () => {
  it('filtre olmadan listAll çağrılır', async () => {
    const repo = makeRepo([{ id: 'obj-1' }, { id: 'obj-2' }]);
    const uc = new ListAllObjectionsUseCase(repo as any);
    const result = await uc.execute();
    expect(repo.listAll).toHaveBeenCalledWith(undefined);
    expect(result).toHaveLength(2);
  });

  it('status filtresi repo\'ya iletilir', async () => {
    const repo = makeRepo([]);
    const uc = new ListAllObjectionsUseCase(repo as any);
    await uc.execute({ status: 'RESOLVED' });
    expect(repo.listAll).toHaveBeenCalledWith({ status: 'RESOLVED' });
  });

  it('tarih aralığı filtresi repo\'ya iletilir', async () => {
    const repo = makeRepo([]);
    const uc = new ListAllObjectionsUseCase(repo as any);
    const from = new Date('2026-01-01');
    const to = new Date('2026-06-01');
    await uc.execute({ from, to });
    expect(repo.listAll).toHaveBeenCalledWith({ from, to });
  });

  it('boş sonuç dönebilir', async () => {
    const repo = makeRepo([]);
    const uc = new ListAllObjectionsUseCase(repo as any);
    const result = await uc.execute();
    expect(result).toEqual([]);
  });
});
