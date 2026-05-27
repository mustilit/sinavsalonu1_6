/**
 * AdminStatsController unit testleri.
 */
import { AdminStatsController } from '../../../src/nest/controllers/admin.stats.controller';

describe('AdminStatsController', () => {
  let controller: AdminStatsController;
  let mockGetAdminStats: { execute: jest.Mock };

  beforeEach(() => {
    mockGetAdminStats = {
      execute: jest.fn().mockResolvedValue({
        totalUsers: 1500,
        totalEducators: 200,
        totalCandidates: 1300,
        totalPackages: 450,
        totalRevenueCents: 5_000_000,
      }),
    };
    controller = new AdminStatsController(mockGetAdminStats as any);
  });

  describe('get', () => {
    it('admin istatistiklerini döndürür', async () => {
      const result = await controller.get();
      expect(mockGetAdminStats.execute).toHaveBeenCalled();
      expect(result).toHaveProperty('totalUsers', 1500);
      expect(result).toHaveProperty('totalRevenueCents', 5_000_000);
    });

    it('use case parametresiz çağrılır', async () => {
      await controller.get();
      expect(mockGetAdminStats.execute).toHaveBeenCalledWith();
    });

    it('use case hata fırlattığında üst katmana yayılır', async () => {
      mockGetAdminStats.execute.mockRejectedValueOnce(new Error('DB_ERROR'));
      await expect(controller.get()).rejects.toThrow('DB_ERROR');
    });
  });
});
