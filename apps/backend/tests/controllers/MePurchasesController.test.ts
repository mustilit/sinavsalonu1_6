/**
 * MePurchasesController unit testleri.
 */
import { MePurchasesController } from '../../src/nest/controllers/me.purchases.controller';

describe('MePurchasesController', () => {
  let controller: MePurchasesController;
  let mockListMyPurchases: { execute: jest.Mock };

  const purchases = [
    { id: 'pur-1', testPackageId: 'pkg-1', status: 'PAID', paidAt: new Date() },
    { id: 'pur-2', testPackageId: 'pkg-2', status: 'REFUNDED', paidAt: new Date() },
  ];

  beforeEach(() => {
    mockListMyPurchases = { execute: jest.fn().mockResolvedValue(purchases) };
    controller = new MePurchasesController(mockListMyPurchases as any);
  });

  describe('getPurchases', () => {
    it('candidateId JWT\'den alınarak satın almaları listeler', async () => {
      const req = { user: { id: 'cand-1' } };
      const result = await controller.getPurchases(req as any);
      expect(mockListMyPurchases.execute).toHaveBeenCalledWith('cand-1');
      expect(result).toHaveLength(2);
    });

    it('use case sonucunu doğrudan döndürür', async () => {
      const req = { user: { id: 'cand-1' } };
      const result = await controller.getPurchases(req as any);
      expect(result).toEqual(purchases);
    });

    it('kullanıcı yoksa undefined iletilir', async () => {
      mockListMyPurchases.execute.mockResolvedValue([]);
      const req = {};
      const result = await controller.getPurchases(req as any);
      expect(mockListMyPurchases.execute).toHaveBeenCalledWith(undefined);
      expect(result).toEqual([]);
    });
  });
});
