/**
 * MeRefundsController unit testleri.
 */
import { MeRefundsController } from '../../src/nest/controllers/me.refunds.controller';

describe('MeRefundsController', () => {
  let controller: MeRefundsController;
  let mockListMyRefunds: { execute: jest.Mock };

  const refunds = [
    { id: 'ref-1', status: 'PENDING', reason: 'Çözülemedim', createdAt: new Date() },
  ];

  beforeEach(() => {
    mockListMyRefunds = { execute: jest.fn().mockResolvedValue(refunds) };
    controller = new MeRefundsController(mockListMyRefunds as any);
  });

  describe('getRefunds', () => {
    it('actorId JWT\'den alınarak iade listesi döner', async () => {
      const req = { user: { id: 'cand-1' } };
      const result = await controller.getRefunds(req as any);
      expect(mockListMyRefunds.execute).toHaveBeenCalledWith('cand-1');
      expect(result).toEqual(refunds);
    });

    it('boş iade listesi döndürülebilir', async () => {
      mockListMyRefunds.execute.mockResolvedValue([]);
      const req = { user: { id: 'cand-2' } };
      const result = await controller.getRefunds(req as any);
      expect(result).toHaveLength(0);
    });

    it('use case hata fırlattığında üst katmana yayılır', async () => {
      mockListMyRefunds.execute.mockRejectedValueOnce(new Error('DB_ERROR'));
      await expect(controller.getRefunds({ user: { id: 'cand-1' } } as any)).rejects.toThrow('DB_ERROR');
    });
  });
});
