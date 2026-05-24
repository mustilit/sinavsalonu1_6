import { Reflector } from '@nestjs/core';
import { WorkerPermissionsGuard } from '../../src/nest/guards/worker-permissions.guard';
import { WORKER_PERMISSIONS_KEY } from '../../src/nest/decorators/worker-permissions.decorator';
import { IS_PUBLIC_KEY } from '../../src/nest/decorators/public.decorator';

jest.mock('../../src/infrastructure/database/prisma', () => ({
  prisma: {
    workerPermission: {
      findUnique: jest.fn(),
    },
  },
}));
import { prisma } from '../../src/infrastructure/database/prisma';

class FakeCache {
  store = new Map<string, any>();
  async get<T>(k: string): Promise<T | null> {
    return (this.store.get(k) as T) ?? null;
  }
  async set(k: string, v: any) {
    this.store.set(k, v);
  }
  async del(k: string) {
    this.store.delete(k);
  }
}

const makeCtx = (user: any, requiredPages: string[] | null, isPublic = false) => {
  const handler = function fakeHandler() {};
  const cls = class FakeController {};
  if (isPublic) Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);
  if (requiredPages) Reflect.defineMetadata(WORKER_PERMISSIONS_KEY, requiredPages, handler);
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => handler,
    getClass: () => cls,
  } as any;
};

describe('WorkerPermissionsGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('@Public endpoint → her durumda izin verir', async () => {
    const cache = new FakeCache() as any;
    const guard = new WorkerPermissionsGuard(new Reflector(), cache);
    const ctx = makeCtx(undefined, ['ModerationQueue'], true);
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('@WorkerPermissions decorator yoksa → izin verir (Roles guard yeterli)', async () => {
    const cache = new FakeCache() as any;
    const guard = new WorkerPermissionsGuard(new Reflector(), cache);
    const ctx = makeCtx({ id: 'u', role: 'WORKER' }, null);
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('ADMIN her sayfaya geçer (DB sorgusu yok)', async () => {
    const cache = new FakeCache() as any;
    const guard = new WorkerPermissionsGuard(new Reflector(), cache);
    const ctx = makeCtx({ id: 'admin-1', role: 'ADMIN' }, ['BackupManagement']);
    expect(await guard.canActivate(ctx)).toBe(true);
    expect(prisma.workerPermission.findUnique).not.toHaveBeenCalled();
  });

  it('WORKER + sayfa izninde → geçer', async () => {
    (prisma.workerPermission.findUnique as jest.Mock).mockResolvedValue({
      pages: ['ModerationQueue', 'BackupManagement'],
    });
    const cache = new FakeCache() as any;
    const guard = new WorkerPermissionsGuard(new Reflector(), cache);
    const ctx = makeCtx({ id: 'w-1', role: 'WORKER' }, ['ModerationQueue']);
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('WORKER + sayfa izinsiz → 403', async () => {
    (prisma.workerPermission.findUnique as jest.Mock).mockResolvedValue({ pages: [] });
    const cache = new FakeCache() as any;
    const guard = new WorkerPermissionsGuard(new Reflector(), cache);
    const ctx = makeCtx({ id: 'w-2', role: 'WORKER' }, ['BackupManagement']);
    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });

  it('CANDIDATE + worker-protected sayfa → 403 (defensive)', async () => {
    const cache = new FakeCache() as any;
    const guard = new WorkerPermissionsGuard(new Reflector(), cache);
    const ctx = makeCtx({ id: 'c-1', role: 'CANDIDATE' }, ['BackupManagement']);
    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });

  it('user yoksa → 403', async () => {
    const cache = new FakeCache() as any;
    const guard = new WorkerPermissionsGuard(new Reflector(), cache);
    const ctx = makeCtx(undefined, ['BackupManagement']);
    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });

  it('cache hit → DB\'ye gitmez', async () => {
    const cache = new FakeCache() as any;
    await cache.set('workerPages:w-3', ['BackupManagement']);
    const guard = new WorkerPermissionsGuard(new Reflector(), cache);
    const ctx = makeCtx({ id: 'w-3', role: 'WORKER' }, ['BackupManagement']);
    expect(await guard.canActivate(ctx)).toBe(true);
    expect(prisma.workerPermission.findUnique).not.toHaveBeenCalled();
  });

  it('birden fazla page hepsi gerekli (AND semantik)', async () => {
    (prisma.workerPermission.findUnique as jest.Mock).mockResolvedValue({
      pages: ['ModerationQueue'],
    });
    const cache = new FakeCache() as any;
    const guard = new WorkerPermissionsGuard(new Reflector(), cache);
    const ctx = makeCtx({ id: 'w-4', role: 'WORKER' }, [
      'ModerationQueue',
      'BackupManagement',
    ]);
    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });
});
