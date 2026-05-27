/**
 * OriginProtectionGuard unit testleri.
 */
import { OriginProtectionGuard } from '../../src/nest/guards/origin-protection.guard';
import { ForbiddenException } from '@nestjs/common';

const makeCtx = (opts: {
  method?: string;
  origin?: string;
  referer?: string;
  clientApp?: string;
  allowNoOrigin?: boolean;
}) => {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(opts.allowNoOrigin ?? false),
    get: jest.fn(),
  };
  const req = {
    method: opts.method ?? 'POST',
    url: '/test',
    ip: '127.0.0.1',
    headers: {
      origin: opts.origin,
      referer: opts.referer,
      'x-client-app': opts.clientApp,
    },
  };
  const ctx = {
    getHandler: jest.fn().mockReturnValue({}),
    getClass: jest.fn().mockReturnValue({}),
    switchToHttp: jest.fn().mockReturnValue({ getRequest: jest.fn().mockReturnValue(req) }),
  };
  return { guard: new OriginProtectionGuard(reflector as any), ctx: ctx as any };
};

describe('OriginProtectionGuard', () => {
  describe('canActivate', () => {
    it('devre dışı ortamda her zaman geçer', () => {
      const old = process.env.ORIGIN_PROTECTION_DISABLED;
      process.env.ORIGIN_PROTECTION_DISABLED = '1';
      try {
        const { guard, ctx } = makeCtx({ method: 'POST' });
        expect(guard.canActivate(ctx)).toBe(true);
      } finally {
        if (old === undefined) delete process.env.ORIGIN_PROTECTION_DISABLED;
        else process.env.ORIGIN_PROTECTION_DISABLED = old;
      }
    });

    it('GET isteği kontrol edilmez', () => {
      const { guard, ctx } = makeCtx({ method: 'GET' });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('@AllowNoOrigin endpoint geçer', () => {
      const { guard, ctx } = makeCtx({ method: 'POST', allowNoOrigin: true });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('localhost origin ile valid POST geçer', () => {
      const { guard, ctx } = makeCtx({
        method: 'POST',
        origin: 'http://localhost:5173',
        clientApp: 'sinavsalonu-web/1.0',
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('origin allowlist dışındaysa INVALID_ORIGIN fırlatır', () => {
      const { guard, ctx } = makeCtx({
        method: 'POST',
        origin: 'http://evil.com',
        clientApp: 'sinavsalonu-web/1.0',
      });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('X-Client-App eksikse MISSING_CLIENT_HEADER fırlatır', () => {
      const { guard, ctx } = makeCtx({
        method: 'POST',
        origin: 'http://localhost:5173',
        clientApp: '',
      });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('X-Client-App prefix yanlışsa fırlatır', () => {
      const { guard, ctx } = makeCtx({
        method: 'POST',
        origin: 'http://localhost:5173',
        clientApp: 'wrong-app/1.0',
      });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('referer allowlist ile eşleşirse geçer', () => {
      const { guard, ctx } = makeCtx({
        method: 'PATCH',
        origin: '',
        referer: 'http://localhost:5173/some-path',
        clientApp: 'sinavsalonu-web/2.0',
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });
});
