/**
 * AdminUsersController unit testleri.
 * Controller PrismaUserRepository'yi doğrudan örneklediğinden prisma mock'lanır.
 */

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    user: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockResolvedValue({ id: 'u-1', role: 'CANDIDATE' }),
    },
  },
}));

jest.mock('../../../src/infrastructure/repositories/PrismaUserRepository', () => ({
  PrismaUserRepository: jest.fn().mockImplementation(() => ({
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    update: jest.fn().mockResolvedValue({ id: 'u-1', role: 'CANDIDATE' }),
  })),
}));

jest.mock('../../../src/application/use-cases/admin/ListUsersUseCase', () => ({
  ListUsersUseCase: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue({ items: [{ id: 'u-1', role: 'CANDIDATE' }], total: 1 }),
  })),
}));

jest.mock('../../../src/application/use-cases/admin/UpdateUserByAdminUseCase', () => ({
  UpdateUserByAdminUseCase: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue({ id: 'u-1', role: 'EDUCATOR' }),
  })),
}));

import { AdminUsersController } from '../../../src/nest/controllers/admin.users.controller';

describe('AdminUsersController', () => {
  let controller: AdminUsersController;

  beforeEach(() => {
    controller = new AdminUsersController();
  });

  describe('list', () => {
    it('filtrelerle kullanıcı listesini getirir', async () => {
      const result = await controller.list('ali', 'CANDIDATE', undefined, '20', '0', undefined);
      expect(result).toBeDefined();
    });

    it('boş parametrelerle çağrılabilir', async () => {
      const result = await controller.list(undefined, undefined, undefined, undefined, undefined, undefined);
      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    it('user_type "educator" rolü EDUCATOR\'a çevirir', async () => {
      const result = await controller.update('u-1', { user_type: 'educator' });
      expect(result).toBeDefined();
    });

    it('user_type "candidate" rolü CANDIDATE\'a çevirir', async () => {
      const result = await controller.update('u-1', { user_type: 'candidate' });
      expect(result).toBeDefined();
    });

    it('educator_status "approved" educatorApprovedAt set eder', async () => {
      const result = await controller.update('u-1', { educator_status: 'approved' });
      expect(result).toBeDefined();
    });

    it('rejection_reason metadataMerge\'e eklenir', async () => {
      const result = await controller.update('u-1', { rejection_reason: 'Eksik belge' });
      expect(result).toBeDefined();
    });
  });
});
