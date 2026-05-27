/**
 * PrismaSubscriptionRepository unit testleri
 */

jest.mock('../../src/infrastructure/database/prisma', () => ({
  prisma: {
    subscription: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { PrismaSubscriptionRepository } from '../../src/infrastructure/repositories/PrismaSubscriptionRepository';
import { prisma } from '../../src/infrastructure/database/prisma';

const mock = prisma as any;

const makeSub = (overrides: Record<string, unknown> = {}) => ({
  id: 'sub-1',
  tenantId: 'tenant-1',
  subscriberId: 'edu-1',
  kind: 'EDUCATOR',
  tier: 'BASIC',
  status: 'ACTIVE',
  providerRef: 'stripe_sub_123',
  customerRef: 'cus_123',
  currentPeriodStart: new Date(),
  currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  cancelAtPeriodEnd: false,
  canceledAt: null,
  trialEndsAt: null,
  ...overrides,
});

describe('PrismaSubscriptionRepository', () => {
  let repo: PrismaSubscriptionRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new PrismaSubscriptionRepository();
  });

  describe('findActive', () => {
    it('aktif abonelik bulunduğunda döner', async () => {
      mock.subscription.findFirst.mockResolvedValue(makeSub());
      const result = await repo.findActive({ subscriberId: 'edu-1' });
      expect(result).not.toBeNull();
      expect(mock.subscription.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: { in: expect.arrayContaining(['ACTIVE']) } }),
        }),
      );
    });

    it('aktif abonelik yoksa null döner', async () => {
      mock.subscription.findFirst.mockResolvedValue(null);
      const result = await repo.findActive({ subscriberId: 'no-sub' });
      expect(result).toBeNull();
    });

    it('tenantId filtresi where kısmına eklenir', async () => {
      mock.subscription.findFirst.mockResolvedValue(null);
      await repo.findActive({ tenantId: 'tenant-1' });
      const where = mock.subscription.findFirst.mock.calls[0][0].where;
      expect(where.tenantId).toBe('tenant-1');
    });
  });

  describe('findByProviderRef', () => {
    it('providerRef ile abonelik döner', async () => {
      mock.subscription.findUnique.mockResolvedValue(makeSub({ providerRef: 'stripe_sub_xyz' }));
      const result = await repo.findByProviderRef('stripe_sub_xyz');
      expect(result?.providerRef).toBe('stripe_sub_xyz');
    });

    it('bulunamazsa null döner', async () => {
      mock.subscription.findUnique.mockResolvedValue(null);
      const result = await repo.findByProviderRef('unknown');
      expect(result).toBeNull();
    });
  });

  describe('upsertByProviderRef', () => {
    const baseInput = {
      tenantId: 'tenant-1',
      subscriberId: 'edu-1',
      kind: 'EDUCATOR' as any,
      tier: 'BASIC' as any,
      status: 'ACTIVE' as any,
      providerRef: 'stripe_sub_123',
    };

    it('providerRef varsa upsert çağrılır', async () => {
      mock.subscription.upsert.mockResolvedValue(makeSub());
      await repo.upsertByProviderRef(baseInput);
      expect(mock.subscription.upsert).toHaveBeenCalled();
    });

    it('providerRef yoksa create çağrılır', async () => {
      mock.subscription.create.mockResolvedValue(makeSub({ providerRef: null }));
      await repo.upsertByProviderRef({ ...baseInput, providerRef: undefined });
      expect(mock.subscription.create).toHaveBeenCalled();
      expect(mock.subscription.upsert).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('status güncelleme çağrılır', async () => {
      mock.subscription.update.mockResolvedValue(makeSub({ status: 'CANCELED' }));
      await repo.updateStatus('sub-1', 'CANCELED' as any);
      expect(mock.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: expect.objectContaining({ status: 'CANCELED' }),
      });
    });
  });
});
