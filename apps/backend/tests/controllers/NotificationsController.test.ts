/**
 * NotificationsController unit testleri.
 */

jest.mock('../../src/infrastructure/database/prisma', () => ({
  prisma: {
    notificationPreference: {
      findUnique: jest.fn().mockResolvedValue({ userId: 'cand-1', emailEnabled: true }),
      upsert: jest.fn().mockResolvedValue({ userId: 'cand-1', emailEnabled: false }),
    },
    auditLog: { create: jest.fn().mockResolvedValue({ id: 'a-1' }) },
  },
}));

const mockUnsubscribe = jest.fn().mockResolvedValue(true);
const mockUpdatePrefs = jest.fn().mockResolvedValue({ userId: 'cand-1', emailEnabled: false });

jest.mock('../../src/application/use-cases/notification/UnsubscribeEmailUseCase', () => ({
  UnsubscribeEmailUseCase: jest.fn().mockImplementation(() => ({ execute: mockUnsubscribe })),
}));

jest.mock('../../src/application/use-cases/notification/UpdateNotificationPreferencesUseCase', () => ({
  UpdateNotificationPreferencesUseCase: jest.fn().mockImplementation(() => ({ execute: mockUpdatePrefs })),
}));

jest.mock('../../src/infrastructure/repositories/PrismaNotificationPreferenceRepository', () => ({
  PrismaNotificationPreferenceRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../src/infrastructure/repositories/PrismaAuditLogRepository', () => ({
  PrismaAuditLogRepository: jest.fn().mockImplementation(() => ({})),
}));

import { NotificationsController } from '../../src/nest/controllers/notifications.controller';

describe('NotificationsController', () => {
  let controller: NotificationsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new NotificationsController();
  });

  describe('unsubscribe', () => {
    it('geçerli token ile abonelikten çıkar', async () => {
      const result = await controller.unsubscribe('valid-token-123');
      expect(mockUnsubscribe).toHaveBeenCalledWith('valid-token-123');
      expect(result).toEqual({ ok: true });
    });

    it('token yoksa ok: false döner', async () => {
      const result = await controller.unsubscribe('');
      expect(result).toEqual({ ok: false });
    });

    it('use case false döndürürse ok: false döner', async () => {
      mockUnsubscribe.mockResolvedValueOnce(false);
      const result = await controller.unsubscribe('expired-token');
      expect(result).toEqual({ ok: false });
    });
  });

  describe('updatePreferences', () => {
    it('kullanıcı tercihlerini günceller', async () => {
      const body = { emailEnabled: false, weeklyDigestEnabled: true };
      const req = { user: { id: 'cand-1' } };
      const result = await controller.updatePreferences(body, req as any);
      expect(mockUpdatePrefs).toHaveBeenCalledWith('cand-1', body);
      expect(result).toEqual({ ok: true, pref: expect.any(Object) });
    });

    it('userId yoksa ok: false döner', async () => {
      const body = { emailEnabled: false };
      const req = {};
      const result = await controller.updatePreferences(body, req as any);
      expect(result).toEqual({ ok: false });
    });
  });
});
