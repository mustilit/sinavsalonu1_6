/**
 * UpdateWorkerPermissionsUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - Kullanıcı bulunamazsa USER_NOT_FOUND fırlatır
 * - Kullanıcı WORKER değilse NOT_WORKER fırlatır
 * - Başarılı güncellemede pages döner
 * - Cache invalidasyon çağrılır
 */

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    workerPermission: { upsert: jest.fn() },
  },
}));

jest.mock('../../../src/nest/guards/worker-permissions.guard', () => ({
  invalidateWorkerPagesCache: jest.fn().mockResolvedValue(undefined),
}));

import { UpdateWorkerPermissionsUseCase } from '../../../src/application/use-cases/admin/UpdateWorkerPermissionsUseCase';
import { prisma } from '../../../src/infrastructure/database/prisma';
import { invalidateWorkerPagesCache } from '../../../src/nest/guards/worker-permissions.guard';

const mockPrisma = prisma as any;
const mockInvalidate = invalidateWorkerPagesCache as jest.Mock;

describe('UpdateWorkerPermissionsUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('kullanıcı bulunamazsa USER_NOT_FOUND fırlatır', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const uc = new UpdateWorkerPermissionsUseCase({ get: jest.fn(), set: jest.fn(), del: jest.fn() } as any);
    await expect(uc.execute('nonexistent', ['reports'])).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
  });

  it('kullanıcı WORKER değilse NOT_WORKER fırlatır', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', role: 'ADMIN' });
    const uc = new UpdateWorkerPermissionsUseCase({ get: jest.fn(), set: jest.fn(), del: jest.fn() } as any);
    await expect(uc.execute('user-1', ['reports'])).rejects.toMatchObject({ code: 'NOT_WORKER' });
  });

  it('başarılı güncellemede userId ve pages döner', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'worker-1', role: 'WORKER' });
    mockPrisma.workerPermission.upsert.mockResolvedValue({ userId: 'worker-1', pages: ['reports', 'users'] });
    const uc = new UpdateWorkerPermissionsUseCase({ get: jest.fn(), set: jest.fn(), del: jest.fn() } as any);
    const result = await uc.execute('worker-1', ['reports', 'users']);
    expect(result.userId).toBe('worker-1');
    expect(result.pages).toEqual(['reports', 'users']);
  });

  it('cache invalidasyon çağrılır', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'worker-1', role: 'WORKER' });
    mockPrisma.workerPermission.upsert.mockResolvedValue({ userId: 'worker-1', pages: [] });
    const cache = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
    const uc = new UpdateWorkerPermissionsUseCase(cache as any);
    await uc.execute('worker-1', []);
    expect(mockInvalidate).toHaveBeenCalled();
  });
});
