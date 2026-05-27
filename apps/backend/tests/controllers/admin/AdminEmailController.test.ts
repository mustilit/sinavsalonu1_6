/**
 * AdminEmailController unit testleri.
 * getKillSwitches prisma'yı doğrudan kullandığı için bu endpoint için
 * yalnızca toggleKillSwitch ve diğer use-case bazlı endpoint'ler test edilir.
 */

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    adminSettings: {
      findFirst: jest.fn().mockResolvedValue({
        id: 1,
        emailEnabled: true,
        emailEducatorCriticalEnabled: true,
        emailEducatorNotifyEnabled: true,
        emailEducatorBulkEnabled: true,
        emailCandidateCriticalEnabled: true,
        emailCandidateNotifyEnabled: true,
        emailCandidateBulkEnabled: true,
        emailStaffCriticalEnabled: true,
        emailStaffNotifyEnabled: true,
        emailDailyCapPerUser: 20,
        emailBounceRateAlertThreshold: 0.02,
        emailRetentionDays: 90,
        emailBulkAutoPausedAt: null,
        emailBulkAutoPausedReason: null,
        emailSendWindowEnabled: false,
        emailSendWindowStartHour: 8,
        emailSendWindowEndHour: 22,
        emailSendWindowTimezone: 'Europe/Istanbul',
        emailSendWindowAppliesToCritical: false,
      }),
    },
  },
}));

jest.mock('../../../src/common/tenant', () => ({ getDefaultTenantId: () => 'dev-tenant' }));

import { AdminEmailController } from '../../../src/nest/controllers/admin.email.controller';

describe('AdminEmailController', () => {
  let controller: AdminEmailController;
  let mockMetricsUC: { execute: jest.Mock };
  let mockListLogsUC: { execute: jest.Mock };
  let mockGetLogUC: { execute: jest.Mock };
  let mockRetryUC: { execute: jest.Mock };
  let mockProviderUC: { list: jest.Mock; create: jest.Mock; update: jest.Mock; delete: jest.Mock };
  let mockTestProviderUC: { execute: jest.Mock };
  let mockKillSwitchUC: { execute: jest.Mock };
  let mockSuppressionUC: { list: jest.Mock; add: jest.Mock; remove: jest.Mock };
  let mockTemplateUC: { list: jest.Mock; update: jest.Mock };

  beforeEach(() => {
    mockMetricsUC = { execute: jest.fn().mockResolvedValue({ totalSent: 100, totalFailed: 5 }) };
    mockListLogsUC = { execute: jest.fn().mockResolvedValue({ items: [], nextCursor: null }) };
    mockGetLogUC = { execute: jest.fn().mockResolvedValue({ id: 'log-1', status: 'SENT' }) };
    mockRetryUC = { execute: jest.fn().mockResolvedValue({ queued: true }) };
    mockProviderUC = {
      list: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'prov-1' }),
      update: jest.fn().mockResolvedValue({ id: 'prov-1' }),
      delete: jest.fn().mockResolvedValue({ deleted: true }),
    };
    mockTestProviderUC = { execute: jest.fn().mockResolvedValue({ success: true }) };
    mockKillSwitchUC = { execute: jest.fn().mockResolvedValue({ ok: true }) };
    mockSuppressionUC = {
      list: jest.fn().mockResolvedValue({ items: [] }),
      add: jest.fn().mockResolvedValue({ id: 'sup-1' }),
      remove: jest.fn().mockResolvedValue({ deleted: true }),
    };
    mockTemplateUC = {
      list: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ id: 'tmpl-1' }),
    };
    controller = new AdminEmailController(
      mockMetricsUC as any,
      mockListLogsUC as any,
      mockGetLogUC as any,
      mockRetryUC as any,
      mockProviderUC as any,
      mockTestProviderUC as any,
      mockKillSwitchUC as any,
      mockSuppressionUC as any,
      mockTemplateUC as any,
    );
  });

  describe('dashboard', () => {
    it('tenantId ile metrik use case\'i çağırır', async () => {
      await controller.dashboard();
      expect(mockMetricsUC.execute).toHaveBeenCalledWith({ tenantId: 'dev-tenant' });
    });
  });

  describe('listLogs', () => {
    it('cursor ve filtrelerle log listesini getirir', async () => {
      const q = { cursorId: 'log-5', cursorQueuedAt: '2025-01-01T00:00:00Z', limit: 50, queue: 'CRITICAL', status: 'SENT' } as any;
      await controller.listLogs(q);
      expect(mockListLogsUC.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'dev-tenant',
          cursor: { id: 'log-5', queuedAt: '2025-01-01T00:00:00Z' },
          filter: expect.objectContaining({ queue: 'CRITICAL', status: 'SENT' }),
        }),
      );
    });

    it('cursor yoksa undefined iletilir', async () => {
      await controller.listLogs({} as any);
      expect(mockListLogsUC.execute).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: undefined }),
      );
    });
  });

  describe('getLog', () => {
    it('id ile log detayını getirir', async () => {
      const result = await controller.getLog('log-1');
      expect(mockGetLogUC.execute).toHaveBeenCalledWith({ tenantId: 'dev-tenant', id: 'log-1' });
      expect(result).toHaveProperty('status', 'SENT');
    });

    it('use case hata fırlattığında HttpException döner', async () => {
      mockGetLogUC.execute.mockRejectedValueOnce(Object.assign(new Error('Not found'), { status: 404 }));
      await expect(controller.getLog('nonexistent')).rejects.toBeDefined();
    });
  });

  describe('retry', () => {
    it('emailLogId ve actorId ile retry çalıştırır', async () => {
      const req = { user: { sub: 'admin-1' } };
      await controller.retry('log-1', req as any);
      expect(mockRetryUC.execute).toHaveBeenCalledWith({
        tenantId: 'dev-tenant',
        emailLogId: 'log-1',
        actorId: 'admin-1',
      });
    });
  });

  describe('listProviders', () => {
    it('provider listesini döndürür', async () => {
      await controller.listProviders();
      expect(mockProviderUC.list).toHaveBeenCalledWith('dev-tenant');
    });
  });

  describe('createProvider', () => {
    it('body ve actorId ile provider oluşturur', async () => {
      const body = { name: 'Brevo', kind: 'BREVO_API' } as any;
      const req = { user: { sub: 'admin-1' } };
      await controller.createProvider(body, req as any);
      expect(mockProviderUC.create).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'dev-tenant', actorId: 'admin-1', name: 'Brevo' }),
      );
    });
  });

  describe('updateProvider', () => {
    it('id ve body ile provider günceller', async () => {
      const body = { name: 'Yeni İsim' } as any;
      const req = { user: { sub: 'admin-1' } };
      await controller.updateProvider('prov-1', body, req as any);
      expect(mockProviderUC.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'prov-1', name: 'Yeni İsim' }),
      );
    });
  });

  describe('testProvider', () => {
    it('test maili gönderim use case\'ini çağırır', async () => {
      const body = { toEmail: 'test@example.com', subject: 'Test' } as any;
      const req = { user: { sub: 'admin-1' } };
      await controller.testProvider('prov-1', body, req as any);
      expect(mockTestProviderUC.execute).toHaveBeenCalledWith(
        expect.objectContaining({ providerConfigId: 'prov-1', toEmail: 'test@example.com' }),
      );
    });
  });

  describe('toggleKillSwitch', () => {
    it('değişiklikler ve reason ile kill switch use case\'ini çağırır', async () => {
      const body = { emailEnabled: false, reason: 'Bakım' } as any;
      const req = { user: { sub: 'admin-1' } };
      await controller.toggleKillSwitch(body, req as any);
      expect(mockKillSwitchUC.execute).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', reason: 'Bakım' }),
      );
    });
  });

  describe('listSuppressions', () => {
    it('cursor ve search ile suppression listeler', async () => {
      const q = { cursor: 'sup-5', limit: 20, search: 'test@' } as any;
      await controller.listSuppressions(q);
      expect(mockSuppressionUC.list).toHaveBeenCalledWith({
        tenantId: 'dev-tenant',
        cursor: { id: 'sup-5' },
        limit: 20,
        search: 'test@',
      });
    });
  });

  describe('addSuppression', () => {
    it('email ve actorId ile suppression ekler', async () => {
      const body = { email: 'bounce@example.com', reason: 'HARD_BOUNCE' } as any;
      const req = { user: { sub: 'admin-1' } };
      await controller.addSuppression(body, req as any);
      expect(mockSuppressionUC.add).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'dev-tenant', actorId: 'admin-1', email: 'bounce@example.com' }),
      );
    });
  });

  describe('deleteSuppression', () => {
    it('id ve actorId ile suppression siler', async () => {
      const req = { user: { sub: 'admin-1' } };
      await controller.deleteSuppression('sup-1', req as any);
      expect(mockSuppressionUC.remove).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'sup-1', actorId: 'admin-1' }),
      );
    });
  });

  describe('listTemplates', () => {
    it('şablon listesini döndürür', async () => {
      await controller.listTemplates();
      expect(mockTemplateUC.list).toHaveBeenCalledWith('dev-tenant');
    });
  });

  describe('updateTemplate', () => {
    it('şablon id ve body ile günceller', async () => {
      const body = { isActive: false } as any;
      const req = { user: { sub: 'admin-1' } };
      await controller.updateTemplate('tmpl-1', body, req as any);
      expect(mockTemplateUC.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'tmpl-1', actorId: 'admin-1' }),
      );
    });
  });
});
