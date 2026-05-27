/**
 * ObjectionsController unit testleri.
 */
import { ObjectionsController } from '../../src/nest/controllers/objections.controller';

describe('ObjectionsController', () => {
  let controller: ObjectionsController;
  let mockCreateObjection: { execute: jest.Mock };

  const objection = { id: 'obj-1', attemptId: 'att-1', questionId: 'q-1', reason: 'Soru yanlış', status: 'PENDING' };

  beforeEach(() => {
    mockCreateObjection = { execute: jest.fn().mockResolvedValue(objection) };
    controller = new ObjectionsController(mockCreateObjection as any);
  });

  describe('create', () => {
    it('itiraz oluşturur', async () => {
      const body = { attemptId: 'att-1', questionId: 'q-1', reason: 'Soru yanlış' } as any;
      const req = { user: { id: 'cand-1' } };
      const result = await controller.create(body, req as any);
      expect(mockCreateObjection.execute).toHaveBeenCalledWith(
        { attemptId: 'att-1', questionId: 'q-1', reason: 'Soru yanlış' },
        'cand-1',
      );
      expect(result).toHaveProperty('id', 'obj-1');
    });

    it('actorId JWT\'den alınır', async () => {
      const body = { attemptId: 'att-2', questionId: 'q-2', reason: 'Cevap anahtarı hatalı' } as any;
      const req = { user: { id: 'cand-99' } };
      await controller.create(body, req as any);
      expect(mockCreateObjection.execute).toHaveBeenCalledWith(expect.any(Object), 'cand-99');
    });
  });
});
