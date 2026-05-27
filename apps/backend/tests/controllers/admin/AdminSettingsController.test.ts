/**
 * AdminSettingsController unit testleri.
 */

jest.mock('../../../src/infrastructure/audit/AuditLogger', () => ({
  auditContextFromRequest: jest.fn().mockReturnValue({ ip: '127.0.0.1', actorId: 'admin-1' }),
}));

import { AdminSettingsController } from '../../../src/nest/controllers/admin.settings.controller';

describe('AdminSettingsController', () => {
  let controller: AdminSettingsController;
  let mockPrisma: object;
  let mockGetSettings: { execute: jest.Mock };
  let mockUpdateSettings: { execute: jest.Mock };

  beforeEach(() => {
    mockPrisma = {};
    mockGetSettings = { execute: jest.fn().mockResolvedValue({ commissionPercent: 20, purchasesEnabled: true }) };
    mockUpdateSettings = { execute: jest.fn().mockResolvedValue({ commissionPercent: 15 }) };
    controller = new AdminSettingsController(
      mockPrisma as any,
      mockGetSettings as any,
      mockUpdateSettings as any,
    );
  });

  describe('get', () => {
    it('admin ayarlarını döndürür', async () => {
      const result = await controller.get();
      expect(mockGetSettings.execute).toHaveBeenCalledWith(mockPrisma);
      expect(result).toHaveProperty('commissionPercent', 20);
    });
  });

  describe('update', () => {
    it('DTO ile ayarları günceller', async () => {
      const dto = { commissionPercent: 15, purchasesEnabled: false } as any;
      const req = { user: { id: 'admin-1', role: 'ADMIN' }, headers: {} };
      const result = await controller.update(dto, req as any);
      expect(mockUpdateSettings.execute).toHaveBeenCalledWith(
        mockPrisma,
        expect.objectContaining({ commissionPercent: 15 }),
        expect.any(Object),
      );
      expect(result).toHaveProperty('commissionPercent', 15);
    });

    it('audit context ile çağrılır', async () => {
      const { auditContextFromRequest } = require('../../../src/infrastructure/audit/AuditLogger');
      const dto = {} as any;
      const req = { user: { id: 'admin-1' }, headers: {} };
      await controller.update(dto, req as any);
      expect(auditContextFromRequest).toHaveBeenCalledWith(req);
    });
  });
});
