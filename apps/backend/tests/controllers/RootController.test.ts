/**
 * RootController unit testleri.
 */
import { RootController } from '../../src/nest/controllers/root.controller';

describe('RootController', () => {
  let controller: RootController;

  beforeEach(() => {
    controller = new RootController();
  });

  describe('root', () => {
    it('servis adı ve durum bilgisi döndürür', () => {
      const result = controller.root();
      expect(result).toEqual({ status: 'ok', service: 'dal' });
    });
  });
});
