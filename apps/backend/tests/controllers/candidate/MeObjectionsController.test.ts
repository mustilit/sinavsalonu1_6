/**
 * MeObjectionsController unit testleri.
 */
import { MeObjectionsController } from '../../../src/nest/controllers/me.objections.controller';

describe('MeObjectionsController', () => {
  let controller: MeObjectionsController;
  let mockListMyObjections: { execute: jest.Mock };

  const obj = { id: 'obj-1', status: 'PENDING', questionId: 'q-1' };

  beforeEach(() => {
    mockListMyObjections = { execute: jest.fn().mockResolvedValue([obj]) };
    controller = new MeObjectionsController(mockListMyObjections as any);
  });

  describe('getMyObjections', () => {
    it('adayın kendi itirazlarını listeler', async () => {
      const req = { user: { id: 'cand-1' } };
      const result = await controller.getMyObjections(req as any);
      expect(mockListMyObjections.execute).toHaveBeenCalledWith('cand-1', { status: undefined });
      expect(result).toBeInstanceOf(Array);
    });

    it('status filtresiyle sorgular', async () => {
      const req = { user: { id: 'cand-1' } };
      await controller.getMyObjections(req as any, 'PENDING');
      expect(mockListMyObjections.execute).toHaveBeenCalledWith('cand-1', { status: 'PENDING' });
    });
  });
});
