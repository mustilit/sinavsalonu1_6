/**
 * ManageSuppressedEmailUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - list: cursor pagination doğru çalışır
 * - add: email normalize edilerek kaydedilir
 * - add: AuditLog EMAIL_SUPPRESSION_ADDED yazılır
 * - remove: kayıt bulunamazsa 404 fırlatır
 * - remove: silme ve AuditLog yazılır
 */

const mockDb = {
  suppressedEmail: {
    findMany: jest.fn(),
    upsert: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
  },
  auditLog: { create: jest.fn() },
};

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: mockDb,
}));

import { ManageSuppressedEmailUseCase } from '../../../src/application/use-cases/email/ManageSuppressedEmailUseCase';

const makeRow = (id: string, email: string) => ({
  id,
  tenantId: 'tenant-1',
  email,
  reason: 'HARD_BOUNCE',
  source: 'manual',
  note: null,
  createdBy: 'admin-1',
  expiresAt: null,
  createdAt: new Date(),
});

describe('ManageSuppressedEmailUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('3 kayıt limit=3 ile nextCursor:null döner', async () => {
      mockDb.suppressedEmail.findMany.mockResolvedValue(
        Array.from({ length: 3 }, (_, i) => makeRow(`r-${i}`, `user${i}@test.com`)),
      );
      const uc = new ManageSuppressedEmailUseCase(mockDb as any);
      const result = await uc.list({ tenantId: 'tenant-1', limit: 3 });
      expect(result.items).toHaveLength(3);
      expect(result.nextCursor).toBeNull();
    });

    it('limit+1 kayıt olduğunda nextCursor dolu olur', async () => {
      mockDb.suppressedEmail.findMany.mockResolvedValue(
        Array.from({ length: 4 }, (_, i) => makeRow(`r-${i}`, `user${i}@test.com`)),
      );
      const uc = new ManageSuppressedEmailUseCase(mockDb as any);
      const result = await uc.list({ tenantId: 'tenant-1', limit: 3 });
      expect(result.items).toHaveLength(3);
      expect(result.nextCursor).not.toBeNull();
    });
  });

  describe('add', () => {
    it('email büyük harf ile girilse normalize edilerek kaydedilir', async () => {
      mockDb.suppressedEmail.upsert.mockResolvedValue(makeRow('r-1', 'test@example.com'));
      mockDb.auditLog.create.mockResolvedValue({});
      const uc = new ManageSuppressedEmailUseCase(mockDb as any);
      await uc.add({ tenantId: 'tenant-1', actorId: 'admin-1', email: 'TEST@EXAMPLE.COM', reason: 'HARD_BOUNCE' as any });
      const upsertCall = mockDb.suppressedEmail.upsert.mock.calls[0][0];
      expect(upsertCall.create.email).toBe('test@example.com');
    });

    it('AuditLog EMAIL_SUPPRESSION_ADDED yazılır', async () => {
      mockDb.suppressedEmail.upsert.mockResolvedValue(makeRow('r-1', 'test@example.com'));
      mockDb.auditLog.create.mockResolvedValue({});
      const uc = new ManageSuppressedEmailUseCase(mockDb as any);
      await uc.add({ tenantId: 'tenant-1', actorId: 'admin-1', email: 'test@example.com', reason: 'HARD_BOUNCE' as any });
      expect(mockDb.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'EMAIL_SUPPRESSION_ADDED' }),
        }),
      );
    });
  });

  describe('remove', () => {
    it('kayıt bulunamazsa 404 fırlatır', async () => {
      mockDb.suppressedEmail.findFirst.mockResolvedValue(null);
      const uc = new ManageSuppressedEmailUseCase(mockDb as any);
      await expect(uc.remove({ tenantId: 'tenant-1', actorId: 'admin-1', id: 'nonexistent' }))
        .rejects.toMatchObject({ status: 404 });
    });

    it('silme ve AuditLog EMAIL_SUPPRESSION_REMOVED yazılır', async () => {
      mockDb.suppressedEmail.findFirst.mockResolvedValue(makeRow('r-1', 'test@example.com'));
      mockDb.suppressedEmail.delete.mockResolvedValue({});
      mockDb.auditLog.create.mockResolvedValue({});
      const uc = new ManageSuppressedEmailUseCase(mockDb as any);
      const result = await uc.remove({ tenantId: 'tenant-1', actorId: 'admin-1', id: 'r-1' });
      expect(result.ok).toBe(true);
      expect(mockDb.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'EMAIL_SUPPRESSION_REMOVED' }),
        }),
      );
    });
  });
});
