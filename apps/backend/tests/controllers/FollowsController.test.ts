/**
 * FollowsController unit testleri.
 * Controller constructor'da PrismaFollowRepository ve PrismaAuditLogRepository
 * örneklediğinden her iki repository mock'lanır.
 */

jest.mock('../../src/infrastructure/database/prisma', () => ({
  prisma: {
    follow: { findMany: jest.fn(), create: jest.fn(), deleteMany: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));

const mockFollowExecute = jest.fn().mockResolvedValue(undefined);
const mockUnfollowExecute = jest.fn().mockResolvedValue(undefined);
const mockListFollowsByFollower = jest.fn().mockResolvedValue([]);

jest.mock('../../src/infrastructure/repositories/PrismaFollowRepository', () => ({
  PrismaFollowRepository: jest.fn().mockImplementation(() => ({
    listFollowsByFollower: mockListFollowsByFollower,
    follow: jest.fn(),
    unfollow: jest.fn(),
  })),
}));

jest.mock('../../src/infrastructure/repositories/PrismaAuditLogRepository', () => ({
  PrismaAuditLogRepository: jest.fn().mockImplementation(() => ({
    create: jest.fn(),
  })),
}));

jest.mock('../../src/application/use-cases/educator/FollowUseCase', () => ({
  FollowUseCase: jest.fn().mockImplementation(() => ({
    execute: mockFollowExecute,
  })),
}));

jest.mock('../../src/application/use-cases/educator/UnfollowUseCase', () => ({
  UnfollowUseCase: jest.fn().mockImplementation(() => ({
    execute: mockUnfollowExecute,
  })),
}));

import { FollowsController } from '../../src/nest/controllers/follows.controller';

describe('FollowsController', () => {
  let controller: FollowsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new FollowsController();
  });

  describe('follow', () => {
    it('eğiticiyi takip eder ve ok döner', async () => {
      const body = { followType: 'EDUCATOR', educatorId: 'edu-1', notificationsEnabled: true };
      const req = { user: { id: 'cand-1' } };
      const result = await controller.follow(body, req as any);
      expect(mockFollowExecute).toHaveBeenCalledWith(
        expect.objectContaining({ followerId: 'cand-1', followType: 'EDUCATOR', educatorId: 'edu-1' }),
      );
      expect(result).toEqual({ ok: true });
    });

    it('sınav türü takip eder', async () => {
      const body = { followType: 'EXAM_TYPE', examTypeId: 'et-1' };
      const req = { user: { id: 'cand-2' } };
      const result = await controller.follow(body, req as any);
      expect(result).toEqual({ ok: true });
    });
  });

  describe('unfollow', () => {
    it('takipten çıkar ve ok döner', async () => {
      const body = { followType: 'EDUCATOR', educatorId: 'edu-1' };
      const req = { user: { id: 'cand-1' } };
      const result = await controller.unfollow(body, req as any);
      expect(mockUnfollowExecute).toHaveBeenCalledWith(
        expect.objectContaining({ followerId: 'cand-1', followType: 'EDUCATOR' }),
      );
      expect(result).toEqual({ ok: true });
    });
  });

  describe('list', () => {
    it('takip listesini döndürür', async () => {
      const req = { user: { id: 'cand-1' } };
      const result = await controller.list('EDUCATOR', req as any);
      expect(mockListFollowsByFollower).toHaveBeenCalledWith('cand-1', 'EDUCATOR');
    });
  });
});
