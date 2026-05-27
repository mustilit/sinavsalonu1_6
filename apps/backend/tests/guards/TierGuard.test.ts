/**
 * TierGuard unit testleri.
 */
import { TierGuard } from '../../src/nest/guards/tier.guard';
import { ForbiddenException, HttpException } from '@nestjs/common';

const makeCtx = (opts: {
  requiredTier?: string | undefined;
  user?: any;
  tenant?: any;
}) => {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(opts.requiredTier),
  };
  const req = { user: opts.user, tenant: opts.tenant };
  const ctx = {
    getHandler: jest.fn().mockReturnValue({}),
    getClass: jest.fn().mockReturnValue({}),
    switchToHttp: jest.fn().mockReturnValue({ getRequest: jest.fn().mockReturnValue(req) }),
  };
  return { reflector, req, ctx };
};

describe('TierGuard', () => {
  describe('canActivate', () => {
    it('tier şartı yoksa geçer', async () => {
      const { reflector, ctx } = makeCtx({ requiredTier: undefined });
      const subRepo = { findActive: jest.fn() };
      const guard = new TierGuard(reflector as any, subRepo as any);
      const result = await guard.canActivate(ctx as any);
      expect(result).toBe(true);
    });

    it('user yoksa ForbiddenException fırlatır', async () => {
      const { reflector, ctx } = makeCtx({ requiredTier: 'PRO', user: null });
      const subRepo = { findActive: jest.fn() };
      const guard = new TierGuard(reflector as any, subRepo as any);
      await expect(guard.canActivate(ctx as any)).rejects.toThrow(ForbiddenException);
    });

    it('aktif abonelik yoksa 402 fırlatır', async () => {
      const { reflector, ctx } = makeCtx({
        requiredTier: 'PRO',
        user: { id: 'edu-1', tenantId: 'tenant-1' },
      });
      const subRepo = { findActive: jest.fn().mockResolvedValue(null) };
      const guard = new TierGuard(reflector as any, subRepo as any);
      await expect(guard.canActivate(ctx as any)).rejects.toThrow(HttpException);
    });

    it('abonelik inactive ise 402 fırlatır', async () => {
      const { reflector, ctx } = makeCtx({
        requiredTier: 'PRO',
        user: { id: 'edu-1' },
      });
      const subRepo = {
        findActive: jest.fn().mockResolvedValue({ status: 'CANCELED', tier: 'PRO' }),
      };
      const guard = new TierGuard(reflector as any, subRepo as any);
      await expect(guard.canActivate(ctx as any)).rejects.toThrow(HttpException);
    });

    it('tier yetersizse 402 fırlatır', async () => {
      const { reflector, ctx } = makeCtx({
        requiredTier: 'BUSINESS',
        user: { id: 'edu-1' },
      });
      const subRepo = {
        findActive: jest.fn().mockResolvedValue({ status: 'ACTIVE', tier: 'PRO' }),
      };
      const guard = new TierGuard(reflector as any, subRepo as any);
      await expect(guard.canActivate(ctx as any)).rejects.toThrow(HttpException);
    });

    it('tier eşleşiyorsa geçer', async () => {
      const { reflector, ctx, req } = makeCtx({
        requiredTier: 'PRO',
        user: { id: 'edu-1' },
      });
      const subRepo = {
        findActive: jest.fn().mockResolvedValue({ status: 'ACTIVE', tier: 'PRO' }),
      };
      const guard = new TierGuard(reflector as any, subRepo as any);
      const result = await guard.canActivate(ctx as any);
      expect(result).toBe(true);
      expect((req as any).subscriptionTier).toBe('PRO');
    });

    it('TRIALING statüs de geçer', async () => {
      const { reflector, ctx } = makeCtx({
        requiredTier: 'PRO',
        user: { id: 'edu-1' },
      });
      const subRepo = {
        findActive: jest.fn().mockResolvedValue({ status: 'TRIALING', tier: 'PRO' }),
      };
      const guard = new TierGuard(reflector as any, subRepo as any);
      const result = await guard.canActivate(ctx as any);
      expect(result).toBe(true);
    });

    it('üst tier alt tier gereksinimini karşılar (BUSINESS >= PRO)', async () => {
      const { reflector, ctx } = makeCtx({
        requiredTier: 'PRO',
        user: { id: 'edu-1' },
      });
      const subRepo = {
        findActive: jest.fn().mockResolvedValue({ status: 'ACTIVE', tier: 'BUSINESS' }),
      };
      const guard = new TierGuard(reflector as any, subRepo as any);
      const result = await guard.canActivate(ctx as any);
      expect(result).toBe(true);
    });
  });
});
