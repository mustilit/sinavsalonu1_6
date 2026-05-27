/**
 * AdminDlqController unit testleri.
 * Prisma singleton doğrudan modül içinde kullanıldığından mock'lanır.
 */

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    emailLog: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    auditLog: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

import { AdminDlqController } from '../../../src/nest/controllers/admin.dlq.controller';
import { prisma } from '../../../src/infrastructure/database/prisma';

describe('AdminDlqController', () => {
  let controller: AdminDlqController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AdminDlqController();
  });

  describe('listEmails', () => {
    it('başarısız e-postaları döndürür', async () => {
      (prisma.emailLog.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'log-1',
          status: 'FAILED',
          templateKey: 'password-reset',
          recipientEmail: 'test@example.com',
          recipientRole: 'CANDIDATE',
          providerKind: 'BREVO_API',
          queue: 'CRITICAL',
          attemptCount: 3,
          lastErrorCode: '500',
          lastErrorMessage: 'Server error',
          queuedAt: new Date('2025-01-01'),
        },
      ]);
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await controller.listEmails('10');
      expect(result).toHaveProperty('items');
      expect(result.items[0]).toHaveProperty('source', 'EMAIL');
      expect(result.items[0]).toHaveProperty('status', 'FAILED');
    });

    it('audit log ve email log birleştirilir', async () => {
      (prisma.emailLog.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([
        { id: 'audit-1', createdAt: new Date('2025-01-01'), metadata: {}, actorId: 'admin-1' },
      ]);

      const result = await controller.listEmails();
      expect(result.items[0]).toHaveProperty('source', 'AUDIT');
    });

    it('limit parametresi 1-200 arasında sınırlandırılır', async () => {
      (prisma.emailLog.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      await controller.listEmails('999');
      expect(prisma.emailLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 200 }));
    });
  });

  describe('listErrors', () => {
    it('hata loglarını döndürür', async () => {
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([
        { id: 'e-1', action: 'EMAIL_FAILED', entityType: null, entityId: null, actorId: 'a-1', createdAt: new Date(), metadata: {} },
      ]);

      const result = await controller.listErrors(undefined, undefined);
      expect(result).toHaveProperty('items');
      expect(result.items[0]).toHaveProperty('action', 'EMAIL_FAILED');
    });

    it('action filtresiyle sorgular', async () => {
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      await controller.listErrors('50', 'CSP_VIOLATION');
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { action: 'CSP_VIOLATION' } }),
      );
    });
  });
});
