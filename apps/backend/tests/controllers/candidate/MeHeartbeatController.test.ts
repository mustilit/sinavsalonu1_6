/**
 * MeHeartbeatController unit testleri.
 */
import { MeHeartbeatController } from '../../../src/nest/controllers/me.heartbeat.controller';

describe('MeHeartbeatController', () => {
  let controller: MeHeartbeatController;

  beforeEach(() => {
    controller = new MeHeartbeatController();
  });

  describe('ping', () => {
    it('ok: true döndürür', () => {
      const result = controller.ping();
      expect(result).toHaveProperty('ok', true);
    });

    it('ts alanı sayısal timestamp içerir', () => {
      const before = Date.now();
      const result = controller.ping();
      const after = Date.now();
      expect(result.ts).toBeGreaterThanOrEqual(before);
      expect(result.ts).toBeLessThanOrEqual(after);
    });

    it('her çağrıda farklı ts üretebilir', async () => {
      const r1 = controller.ping();
      await new Promise((resolve) => setTimeout(resolve, 5));
      const r2 = controller.ping();
      expect(r2.ts).toBeGreaterThanOrEqual(r1.ts);
    });
  });
});
