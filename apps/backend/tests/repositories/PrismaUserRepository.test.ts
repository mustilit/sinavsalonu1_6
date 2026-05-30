/**
 * PrismaUserRepository unit testleri.
 *
 * Not (B9): findByEmail/findByUsername/findById/list/updateEducatorProfile
 * `$queryRaw` + `$executeRaw` kullanıyor (REJECTED enum'unu Prisma client tanımıyor;
 * `prisma.user.findUnique/findMany/update` row hydrate edip patlardı). Mock'a
 * `$queryRaw` ve `$executeRaw` eklenmeden testler kırılıyordu.
 */
jest.mock('../../src/infrastructure/database/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      upsert: jest.fn(),
    },
    testAttempt: {
      findMany: jest.fn(),
    },
    workerPermission: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  },
}));

jest.mock('../../src/common/tenant', () => ({
  getDefaultTenantId: () => 'default-tenant',
}));

import { PrismaUserRepository } from '../../src/infrastructure/repositories/PrismaUserRepository';
import { prisma } from '../../src/infrastructure/database/prisma';

const mock = prisma as any;

const makeUserRow = (overrides: Partial<any> = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  username: 'testuser',
  passwordHash: 'hash',
  role: 'CANDIDATE',
  status: 'ACTIVE',
  educatorApprovedAt: null,
  passwordResetToken: null,
  passwordResetTokenExpiresAt: null,
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('PrismaUserRepository', () => {
  let repo: PrismaUserRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new PrismaUserRepository();
  });

  // --- findByEmail (raw SQL — B9) ---

  describe('findByEmail', () => {
    it('email kayıtlıysa kullanıcıyı döner', async () => {
      mock.$queryRaw.mockResolvedValueOnce([makeUserRow()]);
      const result = await repo.findByEmail('test@example.com');
      expect(result).not.toBeNull();
      expect(result!.email).toBe('test@example.com');
    });

    it('email bulunamazsa null döner (boş array)', async () => {
      mock.$queryRaw.mockResolvedValueOnce([]);
      const result = await repo.findByEmail('unknown@example.com');
      expect(result).toBeNull();
    });

    it("emaili lowercase'e normalize ederek sorgular", async () => {
      mock.$queryRaw.mockResolvedValueOnce([makeUserRow({ email: 'upper@example.com' })]);
      await repo.findByEmail('UPPER@EXAMPLE.COM');
      // Prisma template literal — values dizisinde lowercase parametre
      const callArgs = mock.$queryRaw.mock.calls[0];
      const values = callArgs.slice(1).flat();
      expect(values).toContain('upper@example.com');
    });

    it('REJECTED status kullanıcıyı sorunsuz döndürür (enum bypass)', async () => {
      // Prisma client'da REJECTED yok; raw SQL `status::text` cast ile string olarak gelir.
      mock.$queryRaw.mockResolvedValueOnce([makeUserRow({ status: 'REJECTED' })]);
      const result = await repo.findByEmail('rejected@example.com');
      expect(result).not.toBeNull();
      expect((result as any)!.status).toBe('REJECTED');
    });
  });

  // --- findByUsername (raw SQL — B9) ---

  describe('findByUsername', () => {
    it('username kayıtlıysa kullanıcıyı döner', async () => {
      mock.$queryRaw.mockResolvedValueOnce([makeUserRow({ username: 'mehmet' })]);
      const result = await repo.findByUsername('mehmet');
      expect(result).not.toBeNull();
      expect(result!.username).toBe('mehmet');
    });

    it('bulunamazsa null döner', async () => {
      mock.$queryRaw.mockResolvedValueOnce([]);
      const result = await repo.findByUsername('yok');
      expect(result).toBeNull();
    });
  });

  // --- findById (raw SQL — B9) ---

  describe('findById', () => {
    it('kullanıcı bulunduğunda domain nesnesini döner', async () => {
      mock.$queryRaw.mockResolvedValueOnce([makeUserRow()]);
      const result = await repo.findById('user-1');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('user-1');
      expect(result!.role).toBe('CANDIDATE');
    });

    it('kullanıcı bulunamadığında null döner', async () => {
      mock.$queryRaw.mockResolvedValueOnce([]);
      const result = await repo.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  // --- updateLastLoginAt ---

  describe('updateLastLoginAt', () => {
    it('lastLoginAt güncelleme sorgusunu çağırır', async () => {
      mock.user.update.mockResolvedValueOnce(makeUserRow());
      const date = new Date();
      await repo.updateLastLoginAt('user-1', date);
      expect(mock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: expect.objectContaining({ lastLoginAt: date }),
      });
    });
  });

  // --- updateEducatorStatus ---

  describe('updateEducatorStatus', () => {
    it("INACTIVE durumunu SUSPENDED'a çevirir", async () => {
      mock.user.updateMany.mockResolvedValueOnce({ count: 1 });
      mock.$queryRaw.mockResolvedValueOnce([makeUserRow({ status: 'SUSPENDED' })]);

      const result = await repo.updateEducatorStatus('user-1', { status: 'INACTIVE' });
      expect(mock.user.updateMany).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: expect.objectContaining({ status: 'SUSPENDED' }),
      });
      expect(result).not.toBeNull();
    });

    it('kullanıcı bulunamazsa null döner', async () => {
      mock.user.updateMany.mockResolvedValueOnce({ count: 0 });
      const result = await repo.updateEducatorStatus('nonexistent', { status: 'ACTIVE' });
      expect(result).toBeNull();
    });
  });

  // --- updateEducatorProfile (raw SQL + metadata merge — B9) ---

  describe('updateEducatorProfile', () => {
    it('boş metadata için sadece findById sonucu döner (no-op)', async () => {
      mock.$queryRaw.mockResolvedValueOnce([makeUserRow()]);
      const result = await repo.updateEducatorProfile('user-1', { metadata: {} });
      // updateEducatorProfile içinde $executeRaw çağrılmadığını doğrula
      expect(mock.$executeRaw).not.toHaveBeenCalled();
      expect(result).not.toBeNull();
    });

    it('mevcut metadata + yeni alanları merge edip yazar', async () => {
      // 1. $queryRaw: SELECT metadata
      mock.$queryRaw.mockResolvedValueOnce([{ metadata: { existing: 'value', shared: 'old' } }]);
      // 2. $executeRaw: UPDATE
      mock.$executeRaw.mockResolvedValueOnce(1);
      // 3. findById sonrası tekrar $queryRaw
      mock.$queryRaw.mockResolvedValueOnce([makeUserRow({
        metadata: { existing: 'value', shared: 'new', added: 'x' },
      })]);

      const result = await repo.updateEducatorProfile('user-1', {
        metadata: { shared: 'new', added: 'x' },
      });

      expect(mock.$executeRaw).toHaveBeenCalledTimes(1);
      // Update parametrelerinde merged JSON.stringify'lanmış olmalı
      const updateCall = mock.$executeRaw.mock.calls[0];
      const values = updateCall.slice(1).flat();
      const jsonParam = values.find((v: any) => typeof v === 'string' && v.startsWith('{'));
      expect(jsonParam).toBeDefined();
      const parsed = JSON.parse(jsonParam);
      expect(parsed).toEqual({ existing: 'value', shared: 'new', added: 'x' });
      expect(result).not.toBeNull();
    });

    it('kullanıcı bulunamazsa null döner', async () => {
      mock.$queryRaw.mockResolvedValueOnce([]);
      const result = await repo.updateEducatorProfile('nonexistent', {
        metadata: { cv_url: 'x.pdf' },
      });
      expect(mock.$executeRaw).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('REJECTED kullanıcıda da çalışır (enum bypass)', async () => {
      mock.$queryRaw.mockResolvedValueOnce([{ metadata: {} }]);
      mock.$executeRaw.mockResolvedValueOnce(1);
      mock.$queryRaw.mockResolvedValueOnce([makeUserRow({
        status: 'REJECTED',
        metadata: { cv_url: 'new.pdf' },
      })]);

      const result = await repo.updateEducatorProfile('user-1', {
        metadata: { cv_url: 'new.pdf' },
      });
      expect((result as any)!.status).toBe('REJECTED');
    });
  });

  // --- listInactiveUsersWithOpenAttempts ---

  describe('listInactiveUsersWithOpenAttempts', () => {
    it('gün eşiğini geçen IN_PROGRESS denemeleri döner', async () => {
      mock.testAttempt.findMany.mockResolvedValueOnce([
        { candidateId: 'cand-1', id: 'att-1' },
        { candidateId: 'cand-2', id: 'att-2' },
      ]);
      const result = await repo.listInactiveUsersWithOpenAttempts(7);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ userId: 'cand-1', attemptId: 'att-1' });
    });
  });

  // --- list (raw SQL — Sprint öncesi) ---

  describe('list', () => {
    it('filtre olmadan kullanıcıları listeler', async () => {
      const rows = [makeUserRow(), makeUserRow({ id: 'user-2', email: 'b@b.com', username: 'b' })];
      mock.$queryRaw.mockResolvedValueOnce(rows);
      const result = await repo.list({});
      expect(result).toHaveLength(2);
    });

    it('REJECTED kullanıcılar da liste sonuçlarına dahil edilir', async () => {
      const rows = [
        makeUserRow({ status: 'ACTIVE' }),
        makeUserRow({ id: 'rej-1', status: 'REJECTED' }),
      ];
      mock.$queryRaw.mockResolvedValueOnce(rows);
      const result = await repo.list({});
      expect(result).toHaveLength(2);
      expect((result[1] as any).status).toBe('REJECTED');
    });
  });
});
