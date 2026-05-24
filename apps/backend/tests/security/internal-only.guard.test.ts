import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InternalOnlyGuard } from '../../src/nest/guards/internal-only.guard';
import { INTERNAL_ONLY_KEY } from '../../src/nest/decorators/internal-only.decorator';

const makeCtx = (remoteAddress: string, internalMeta: boolean): ExecutionContext => {
  const reflectorMock: any = {
    getAllAndOverride: (key: string) => (key === INTERNAL_ONLY_KEY ? internalMeta : undefined),
  };
  const req: any = { socket: { remoteAddress } };
  const ctx: any = {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => () => {},
    getClass: () => class {},
  };
  return { ctx, reflectorMock } as any;
};

const runGuard = (allowEnv: string | undefined, remoteAddress: string, internal: boolean) => {
  const prev = process.env.METRICS_ALLOWED_IPS;
  if (allowEnv === undefined) delete process.env.METRICS_ALLOWED_IPS;
  else process.env.METRICS_ALLOWED_IPS = allowEnv;
  try {
    // Tek referanslı handler — defineMetadata ile getHandler() aynı function'a
    // bakmalı; aksi halde reflector metadata'yı okuyamaz.
    const handler = function stableHandler() {};
    const cls = class StableController {};
    Reflect.defineMetadata(INTERNAL_ONLY_KEY, internal, handler);
    const ctx: any = {
      switchToHttp: () => ({ getRequest: () => ({ socket: { remoteAddress } }) }),
      getHandler: () => handler,
      getClass: () => cls,
    };
    const reflector = new Reflector();
    const guard = new InternalOnlyGuard(reflector);
    return guard.canActivate(ctx);
  } finally {
    if (prev === undefined) delete process.env.METRICS_ALLOWED_IPS;
    else process.env.METRICS_ALLOWED_IPS = prev;
  }
};

describe('InternalOnlyGuard', () => {
  describe('non-internal endpoint (decorator yok)', () => {
    it('herhangi bir IP\'den geçer', () => {
      expect(runGuard('', '8.8.8.8', false)).toBe(true);
      expect(runGuard('', '203.0.113.7', false)).toBe(true);
    });
  });

  describe('internal endpoint + allowlist boş', () => {
    it('loopback IPv4 geçer', () => {
      expect(runGuard('', '127.0.0.1', true)).toBe(true);
    });
    it('loopback IPv6 geçer', () => {
      expect(runGuard('', '::1', true)).toBe(true);
    });
    it('IPv4-mapped IPv6 loopback geçer', () => {
      expect(runGuard('', '::ffff:127.0.0.1', true)).toBe(true);
    });
    it('public IP reddedilir', () => {
      expect(() => runGuard('', '8.8.8.8', true)).toThrow(/INTERNAL_ONLY_FORBIDDEN|Forbidden/);
    });
  });

  describe('internal + IP allowlist', () => {
    it('listede olan exact IP geçer', () => {
      expect(runGuard('10.0.0.5,192.168.1.100', '10.0.0.5', true)).toBe(true);
      expect(runGuard('10.0.0.5,192.168.1.100', '192.168.1.100', true)).toBe(true);
    });
    it('listede olmayan IP reddedilir', () => {
      expect(() => runGuard('10.0.0.5', '10.0.0.6', true)).toThrow();
    });
  });

  describe('internal + CIDR allowlist', () => {
    it('CIDR aralığındaki IP geçer', () => {
      expect(runGuard('10.0.0.0/24', '10.0.0.5', true)).toBe(true);
      expect(runGuard('10.0.0.0/24', '10.0.0.254', true)).toBe(true);
      expect(runGuard('192.168.0.0/16', '192.168.42.1', true)).toBe(true);
    });
    it('CIDR aralığı dışındaki IP reddedilir', () => {
      expect(() => runGuard('10.0.0.0/24', '10.0.1.5', true)).toThrow();
      expect(() => runGuard('192.168.0.0/16', '192.169.0.1', true)).toBe; // type guard
      expect(() => runGuard('192.168.0.0/16', '10.0.0.1', true)).toThrow();
    });
    it('/32 tek host CIDR\'i exact match\'le çalışır', () => {
      expect(runGuard('10.0.0.5/32', '10.0.0.5', true)).toBe(true);
      expect(() => runGuard('10.0.0.5/32', '10.0.0.6', true)).toThrow();
    });
    it('mixed IP + CIDR listesi', () => {
      const env = '127.0.0.1,10.0.0.0/8,192.168.1.100';
      expect(runGuard(env, '10.255.255.255', true)).toBe(true);
      expect(runGuard(env, '192.168.1.100', true)).toBe(true);
      expect(() => runGuard(env, '172.16.0.1', true)).toThrow();
    });
  });

  describe('IPv4-mapped IPv6 prefix kaldırma', () => {
    it('::ffff:10.0.0.5 → 10.0.0.5 olarak matched', () => {
      expect(runGuard('10.0.0.5', '::ffff:10.0.0.5', true)).toBe(true);
    });
  });
});
