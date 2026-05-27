/**
 * RolesGuard unit testleri.
 */
import { RolesGuard } from '../../src/nest/guards/roles.guard';

const makeContext = (opts: {
  isPublic?: boolean;
  roles?: string[];
  user?: { role: string } | null;
}) => {
  const { isPublic = false, roles = [], user = null } = opts;
  const reflector = {
    getAllAndOverride: jest.fn().mockImplementation((key: string) => {
      if (key === 'PUBLIC_KEY' || key === '__isPublic') return isPublic;
      return undefined;
    }),
    get: jest.fn().mockReturnValue(roles),
  };
  const req = { user };
  const ctx = {
    getHandler: jest.fn().mockReturnValue({}),
    getClass: jest.fn().mockReturnValue({}),
    switchToHttp: jest.fn().mockReturnValue({ getRequest: jest.fn().mockReturnValue(req) }),
  };
  return { guard: new RolesGuard(reflector as any), ctx: ctx as any, reflector };
};

describe('RolesGuard', () => {
  describe('canActivate', () => {
    it('@Public endpoint her zaman geçer', () => {
      const { guard, ctx, reflector } = makeContext({ isPublic: true });
      reflector.getAllAndOverride.mockReturnValue(true);
      const result = guard.canActivate(ctx);
      expect(result).toBe(true);
    });

    it('Roles dekoratörü yoksa (boş dizi) geçer', () => {
      const { guard, ctx, reflector } = makeContext({ isPublic: false, roles: [] });
      reflector.getAllAndOverride.mockReturnValue(false);
      const result = guard.canActivate(ctx);
      expect(result).toBe(true);
    });

    it('User yoksa geçmez', () => {
      const { guard, ctx, reflector } = makeContext({ isPublic: false, roles: ['ADMIN'], user: null });
      reflector.getAllAndOverride.mockReturnValue(false);
      reflector.get.mockReturnValue(['ADMIN']);
      const result = guard.canActivate(ctx);
      expect(result).toBe(false);
    });

    it('User rolü eşleşiyorsa geçer', () => {
      const { guard, ctx, reflector } = makeContext({ isPublic: false, roles: ['ADMIN'], user: { role: 'ADMIN' } });
      reflector.getAllAndOverride.mockReturnValue(false);
      reflector.get.mockReturnValue(['ADMIN']);
      const result = guard.canActivate(ctx);
      expect(result).toBe(true);
    });

    it('User rolü eşleşmiyorsa geçmez', () => {
      const { guard, ctx, reflector } = makeContext({ isPublic: false, roles: ['ADMIN'], user: { role: 'CANDIDATE' } });
      reflector.getAllAndOverride.mockReturnValue(false);
      reflector.get.mockReturnValue(['ADMIN']);
      const result = guard.canActivate(ctx);
      expect(result).toBe(false);
    });

    it('Çoklu rol tanımında herhangi biriyle eşleşirse geçer', () => {
      const { guard, ctx, reflector } = makeContext({ isPublic: false, roles: ['ADMIN', 'EDUCATOR'], user: { role: 'EDUCATOR' } });
      reflector.getAllAndOverride.mockReturnValue(false);
      reflector.get.mockReturnValue(['ADMIN', 'EDUCATOR']);
      const result = guard.canActivate(ctx);
      expect(result).toBe(true);
    });
  });
});
