/**
 * HealthController unit testleri.
 * Redis ve Prisma bağımlılıkları mock'lanır.
 */

jest.mock('../../src/infrastructure/database/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  },
}));

jest.mock('../../src/infrastructure/repositories/ReportingTestRepository', () => ({
  ReportingTestRepository: jest.fn().mockImplementation(() => ({
    replicationLagSeconds: jest.fn().mockResolvedValue(0),
  })),
}));

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    ping: jest.fn().mockResolvedValue('PONG'),
    quit: jest.fn().mockResolvedValue('OK'),
    disconnect: jest.fn(),
  }));
});

jest.mock('../../src/config/redis', () => ({
  getRedisUrl: jest.fn().mockReturnValue('redis://localhost:6379'),
  isRedisDisabled: jest.fn().mockReturnValue(false),
}));

import { HealthController } from '../../src/nest/controllers/health.controller';
import { prisma } from '../../src/infrastructure/database/prisma';
import { isRedisDisabled } from '../../src/config/redis';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new HealthController();
  });

  describe('health', () => {
    it('ok: true döndürür', () => {
      const result = controller.health();
      expect(result).toEqual({ ok: true, service: 'dal' });
    });
  });

  describe('replica', () => {
    it('replikasyon lag bilgisini döndürür', async () => {
      const result = await controller.replica();
      expect(result).toHaveProperty('lagSeconds', 0);
      expect(result).toHaveProperty('ok');
    });
  });

  describe('redisHealth', () => {
    it('Redis devre dışıysa disabled döndürür', async () => {
      (isRedisDisabled as jest.Mock).mockReturnValue(true);
      const result = await controller.redisHealth();
      expect(result).toEqual({ ok: true, redis: false, disabled: true });
    });

    it('Redis aktifse PONG ile ok döndürür', async () => {
      (isRedisDisabled as jest.Mock).mockReturnValue(false);
      const result = await controller.redisHealth();
      expect(result).toEqual({ ok: true, redis: true });
    });
  });

  describe('dbHealth', () => {
    it('DB bağlantısı başarılıysa ok döndürür', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);
      const result = await controller.dbHealth();
      expect(result).toEqual({ ok: true, db: true });
    });

    it('DB hatası olduğunda 503 fırlatır', async () => {
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection refused'));
      await expect(controller.dbHealth()).rejects.toThrow();
    });
  });
});
