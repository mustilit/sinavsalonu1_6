/**
 * MetricsController unit testleri.
 */

const mockMetrics = jest.fn().mockResolvedValue('# HELP process_cpu_user_seconds_total\nprocess_cpu_user_seconds_total 0.1');

jest.mock('../../src/infrastructure/metrics/metrics', () => ({
  metricsRegistry: {
    metrics: mockMetrics,
  },
}));

import { MetricsController } from '../../src/nest/controllers/metrics.controller';

describe('MetricsController', () => {
  let controller: MetricsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new MetricsController();
  });

  describe('metrics', () => {
    it('prometheus metrikleri text/plain formatında döndürür', async () => {
      const result = await controller.metrics();
      expect(result).toContain('process_cpu_user_seconds_total');
    });

    it('metricsRegistry.metrics çağrılır', async () => {
      await controller.metrics();
      expect(mockMetrics).toHaveBeenCalled();
    });

    it('string tipinde sonuç döner', async () => {
      const result = await controller.metrics();
      expect(typeof result).toBe('string');
    });
  });
});
