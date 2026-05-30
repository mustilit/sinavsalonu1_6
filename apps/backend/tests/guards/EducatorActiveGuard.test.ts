/**
 * EducatorActiveGuard unit testleri (B9).
 *
 * Guard zinciri: REJECTED / SUSPENDED eğiticilerin içerik üretim API'lerine
 * (tests / packages / live-sessions / drafts) erişimini 403 ile engeller.
 * Aktif eğitici, başka rol veya kimliksiz istek için no-op.
 */
jest.mock('../../src/infrastructure/database/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

import { ForbiddenException } from '@nestjs/common';
import { EducatorActiveGuard } from '../../src/nest/guards/educator-active.guard';
import { prisma } from '../../src/infrastructure/database/prisma';

const mock = prisma as any;

const makeCtx = (user: any) => {
  const req: any = { user };
  return {
    req,
    ctx: {
      switchToHttp: () => ({ getRequest: () => req }),
    } as any,
  };
};

describe('EducatorActiveGuard', () => {
  let guard: EducatorActiveGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new EducatorActiveGuard();
  });

  it('user yoksa no-op (true) — JwtAuthGuard ya 401 fırlattı ya public endpoint', async () => {
    const { ctx } = makeCtx(null);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(mock.$queryRaw).not.toHaveBeenCalled();
  });

  it('role !== EDUCATOR ise SQL atmaz, true döner', async () => {
    const { ctx } = makeCtx({ id: 'u1', role: 'CANDIDATE' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(mock.$queryRaw).not.toHaveBeenCalled();
  });

  it('ADMIN no-op', async () => {
    const { ctx } = makeCtx({ id: 'a1', role: 'ADMIN' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(mock.$queryRaw).not.toHaveBeenCalled();
  });

  it('EDUCATOR + ACTIVE → true', async () => {
    mock.$queryRaw.mockResolvedValueOnce([{ status: 'ACTIVE' }]);
    const { ctx } = makeCtx({ id: 'e1', role: 'EDUCATOR' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('EDUCATOR + REJECTED → ForbiddenException', async () => {
    mock.$queryRaw.mockResolvedValueOnce([{ status: 'REJECTED' }]);
    const { ctx } = makeCtx({ id: 'e1', role: 'EDUCATOR' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('EDUCATOR + REJECTED response shape: code=EDUCATOR_REJECTED + Türkçe mesaj', async () => {
    mock.$queryRaw.mockResolvedValueOnce([{ status: 'REJECTED' }]);
    const { ctx } = makeCtx({ id: 'e1', role: 'EDUCATOR' });
    try {
      await guard.canActivate(ctx);
      fail('should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ForbiddenException);
      const resp = err.getResponse() as any;
      expect(resp.code).toBe('EDUCATOR_REJECTED');
      expect(String(resp.message)).toMatch(/reddedildiği|yapamazsınız/i);
    }
  });

  it('EDUCATOR + SUSPENDED → ForbiddenException(EDUCATOR_SUSPENDED)', async () => {
    mock.$queryRaw.mockResolvedValueOnce([{ status: 'SUSPENDED' }]);
    const { ctx } = makeCtx({ id: 'e1', role: 'EDUCATOR' });
    try {
      await guard.canActivate(ctx);
      fail('should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ForbiddenException);
      const resp = err.getResponse() as any;
      expect(resp.code).toBe('EDUCATOR_SUSPENDED');
    }
  });

  it('EDUCATOR + PENDING_EDUCATOR_APPROVAL → true (henüz onay bekliyor, içerik kısıtı yok)', async () => {
    // PENDING için backend guard'da kısıt YOK (frontend canAccessPage zaten kilitli).
    // Backend tarafı yalnız REJECTED ve SUSPENDED bloklar.
    mock.$queryRaw.mockResolvedValueOnce([{ status: 'PENDING_EDUCATOR_APPROVAL' }]);
    const { ctx } = makeCtx({ id: 'e1', role: 'EDUCATOR' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('request-scoped cache: aynı request içinde ikinci çağrıda tekrar SQL atmaz', async () => {
    mock.$queryRaw.mockResolvedValueOnce([{ status: 'ACTIVE' }]);
    const { ctx, req } = makeCtx({ id: 'e1', role: 'EDUCATOR' });

    await guard.canActivate(ctx);
    expect(mock.$queryRaw).toHaveBeenCalledTimes(1);
    expect(req._educatorStatusChecked).toEqual({ allowed: true });

    // İkinci çağrı — cache hit, SQL atılmaz
    await guard.canActivate(ctx);
    expect(mock.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('role lowercase gelse de EDUCATOR olarak normalize edilir', async () => {
    mock.$queryRaw.mockResolvedValueOnce([{ status: 'REJECTED' }]);
    const { ctx } = makeCtx({ id: 'e1', role: 'educator' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });
});
