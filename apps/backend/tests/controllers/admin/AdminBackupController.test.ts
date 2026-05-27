/**
 * AdminBackupController unit testleri.
 */
import { AdminBackupController } from '../../../src/nest/controllers/admin.backup.controller';

describe('AdminBackupController', () => {
  let controller: AdminBackupController;
  let mockGetSettings: { execute: jest.Mock };
  let mockUpdateSettings: { execute: jest.Mock };
  let mockRunNow: { execute: jest.Mock };
  let mockListLogs: { execute: jest.Mock };

  beforeEach(() => {
    mockGetSettings = { execute: jest.fn().mockResolvedValue({ backupEnabled: true, backupCronExpression: '0 2 * * *' }) };
    mockUpdateSettings = { execute: jest.fn().mockResolvedValue({ backupEnabled: false }) };
    mockRunNow = { execute: jest.fn().mockResolvedValue({ status: 'SUCCESS', id: 'log-1' }) };
    mockListLogs = { execute: jest.fn().mockResolvedValue({ items: [], nextCursor: null }) };
    controller = new AdminBackupController(
      mockGetSettings as any,
      mockUpdateSettings as any,
      mockRunNow as any,
      mockListLogs as any,
    );
  });

  describe('getSettings', () => {
    it('backup ayarlarını döndürür', async () => {
      const result = await controller.getSettings();
      expect(mockGetSettings.execute).toHaveBeenCalled();
      expect(result).toHaveProperty('backupEnabled');
    });
  });

  describe('updateSettings', () => {
    it('DTO ve actorId kullanarak use case\'i çağırır', async () => {
      const dto = { backupEnabled: false, backupCronExpression: '0 3 * * *', backupTargetDir: '/backup', backupRetentionDays: 7 } as any;
      const req = { user: { id: 'admin-1' } };
      await controller.updateSettings(dto, req as any);
      expect(mockUpdateSettings.execute).toHaveBeenCalledWith({
        actorId: 'admin-1',
        backupEnabled: false,
        backupCronExpression: '0 3 * * *',
        backupTargetDir: '/backup',
        backupRetentionDays: 7,
      });
    });

    it('user yoksa actorId undefined iletilir', async () => {
      const dto = {} as any;
      const req = {};
      await controller.updateSettings(dto, req as any);
      expect(mockUpdateSettings.execute).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: undefined }),
      );
    });
  });

  describe('runNow', () => {
    it('actorId ile backup tetikler', async () => {
      const req = { user: { id: 'admin-1' } };
      const result = await controller.runNow(req as any);
      expect(mockRunNow.execute).toHaveBeenCalledWith('admin-1');
      expect(result).toHaveProperty('status', 'SUCCESS');
    });
  });

  describe('listLogs', () => {
    it('cursor ve limit ile logları listeler', async () => {
      const q = { cursorId: 'log-10', limit: 20 } as any;
      await controller.listLogs(q);
      expect(mockListLogs.execute).toHaveBeenCalledWith({
        cursor: { id: 'log-10' },
        limit: 20,
        status: undefined,
      });
    });

    it('cursorId yoksa cursor undefined iletilir', async () => {
      const q = { limit: 10 } as any;
      await controller.listLogs(q);
      expect(mockListLogs.execute).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: undefined }),
      );
    });

    it('status filtresi iletilir', async () => {
      const q = { status: 'FAILED' } as any;
      await controller.listLogs(q);
      expect(mockListLogs.execute).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'FAILED' }),
      );
    });
  });
});
