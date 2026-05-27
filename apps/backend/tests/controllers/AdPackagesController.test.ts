/**
 * AdPackagesController (public) unit testleri.
 */
import { AdPackagesController } from '../../src/nest/controllers/ad-packages.controller';

describe('AdPackagesController', () => {
  let controller: AdPackagesController;
  let mockListUC: { execute: jest.Mock };

  const pkg = { id: 'ap-1', title: 'Homepage Banner', durationDays: 30, price: 50000 };

  beforeEach(() => {
    mockListUC = { execute: jest.fn().mockResolvedValue([pkg]) };
    controller = new AdPackagesController(mockListUC as any);
  });

  describe('list', () => {
    it('aktif reklam paketlerini listeler', async () => {
      const result = await controller.list();
      expect(mockListUC.execute).toHaveBeenCalledWith(true);
      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toHaveProperty('id', 'ap-1');
    });
  });
});
