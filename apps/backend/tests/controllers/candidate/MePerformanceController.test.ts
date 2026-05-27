/**
 * MePerformanceController unit testleri.
 */
import { MePerformanceController } from '../../../src/nest/controllers/me.performance.controller';

describe('MePerformanceController', () => {
  let controller: MePerformanceController;
  let mockTopicPerformanceUC: { execute: jest.Mock };

  const performanceData = {
    groups: [
      { topicId: 'topic-1', examTypeId: 'et-1', avgCorrectRate: 0.75, timeline: [] },
    ],
    examTypes: [{ id: 'et-1', name: 'YKS' }],
  };

  beforeEach(() => {
    mockTopicPerformanceUC = { execute: jest.fn().mockResolvedValue(performanceData) };
    controller = new MePerformanceController(mockTopicPerformanceUC as any);
  });

  describe('topicPerformance', () => {
    it('candidateId JWT\'den alınarak performans raporunu döndürür', async () => {
      const req = { user: { id: 'cand-1' } };
      const result = await controller.topicPerformance(req as any);
      expect(mockTopicPerformanceUC.execute).toHaveBeenCalledWith('cand-1');
      expect(result).toHaveProperty('groups');
      expect(result).toHaveProperty('examTypes');
    });

    it('use case sonucunu doğrudan döndürür', async () => {
      const req = { user: { id: 'cand-1' } };
      const result = await controller.topicPerformance(req as any);
      expect(result).toEqual(performanceData);
    });

    it('use case hata fırlattığında üst katmana yayılır', async () => {
      mockTopicPerformanceUC.execute.mockRejectedValueOnce(new Error('CANDIDATE_NOT_FOUND'));
      await expect(controller.topicPerformance({ user: { id: 'cand-bad' } } as any)).rejects.toThrow('CANDIDATE_NOT_FOUND');
    });
  });
});
