/**
 * MeModerationController unit testleri.
 */
import { MeModerationController } from '../../../src/nest/controllers/me.moderation.controller';

describe('MeModerationController', () => {
  let controller: MeModerationController;
  let mockGetMyStatusUC: { execute: jest.Mock };

  const statusData = {
    riskLevel: 'LOW',
    activeActions: [],
    recentViolations: 0,
  };

  beforeEach(() => {
    mockGetMyStatusUC = { execute: jest.fn().mockResolvedValue(statusData) };
    controller = new MeModerationController(mockGetMyStatusUC as any);
  });

  describe('getModerationStatus', () => {
    it('userId ve tenantId ile moderasyon durumunu getirir', async () => {
      const req = { user: { id: 'edu-1' } };
      const result = await controller.getModerationStatus(req as any);
      expect(mockGetMyStatusUC.execute).toHaveBeenCalledWith('edu-1', expect.any(String));
      expect(result).toHaveProperty('riskLevel', 'LOW');
    });

    it('use case sonucunu doğrudan döndürür', async () => {
      const req = { user: { id: 'edu-1' } };
      const result = await controller.getModerationStatus(req as any);
      expect(result).toEqual(statusData);
    });

    it('user yoksa undefined iletilir', async () => {
      mockGetMyStatusUC.execute.mockResolvedValue(null);
      const req = {};
      const result = await controller.getModerationStatus(req as any);
      expect(mockGetMyStatusUC.execute).toHaveBeenCalledWith(undefined, expect.any(String));
      expect(result).toBeNull();
    });
  });
});
