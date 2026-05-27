/**
 * AdminWorkersController unit testleri.
 */
import { AdminWorkersController } from '../../../src/nest/controllers/admin.workers.controller';

describe('AdminWorkersController', () => {
  let controller: AdminWorkersController;
  let mockCreateWorkerUC: { execute: jest.Mock };
  let mockGetPermissionsUC: { execute: jest.Mock };
  let mockUpdatePermissionsUC: { execute: jest.Mock };

  beforeEach(() => {
    mockCreateWorkerUC = { execute: jest.fn().mockResolvedValue({ id: 'w-1', email: 'worker@test.com' }) };
    mockGetPermissionsUC = { execute: jest.fn().mockResolvedValue({ userId: 'w-1', pages: ['admin.users'] }) };
    mockUpdatePermissionsUC = { execute: jest.fn().mockResolvedValue({ userId: 'w-1', pages: ['admin.moderation'] }) };
    controller = new AdminWorkersController(
      mockCreateWorkerUC as any,
      mockGetPermissionsUC as any,
      mockUpdatePermissionsUC as any,
    );
  });

  describe('create', () => {
    it('geçerli DTO ile worker oluşturur', async () => {
      const dto = { email: 'worker@test.com', username: 'worker1', password: 'Pass123!', pages: ['admin.users'] } as any;
      const result = await controller.create(dto);
      expect(mockCreateWorkerUC.execute).toHaveBeenCalledWith({
        email: 'worker@test.com',
        username: 'worker1',
        password: 'Pass123!',
        pages: ['admin.users'],
      });
      expect(result).toHaveProperty('id', 'w-1');
    });

    it('pages yoksa boş dizi iletilir', async () => {
      const dto = { email: 'w@test.com', username: 'w2', password: 'pass' } as any;
      await controller.create(dto);
      expect(mockCreateWorkerUC.execute).toHaveBeenCalledWith(
        expect.objectContaining({ pages: [] }),
      );
    });
  });

  describe('getPermissions', () => {
    it('userId ile izinleri getirir', async () => {
      const result = await controller.getPermissions('w-1');
      expect(mockGetPermissionsUC.execute).toHaveBeenCalledWith('w-1');
      expect(result).toHaveProperty('pages');
    });
  });

  describe('updatePermissions', () => {
    it('userId ve pages listesiyle izinleri günceller', async () => {
      const dto = { pages: ['admin.moderation', 'admin.email'] } as any;
      const result = await controller.updatePermissions('w-1', dto);
      expect(mockUpdatePermissionsUC.execute).toHaveBeenCalledWith('w-1', ['admin.moderation', 'admin.email']);
      expect(result).toHaveProperty('userId', 'w-1');
    });
  });
});
