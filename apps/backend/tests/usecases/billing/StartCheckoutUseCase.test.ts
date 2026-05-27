/**
 * StartCheckoutUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - Stripe devre dışıysa BadRequestException
 * - priceId çözülemiyorsa BadRequestException
 * - Kullanıcı bulunamazsa NotFoundException
 * - Mevcut sub'dan customerRef kullanılır
 * - Başarı: sessionId ve url döner
 * - session.url null dönerse BadRequestException
 */

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
  },
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StartCheckoutUseCase } from '../../../src/application/use-cases/billing/StartCheckoutUseCase';
import { prisma } from '../../../src/infrastructure/database/prisma';

const mockPrisma = prisma as any;

function makeStripe(
  enabled = true,
  priceId = 'price_123',
  sessionUrl = 'https://checkout.stripe.com/c/123',
) {
  return {
    isEnabled: jest.fn().mockReturnValue(enabled),
    resolvePriceId: jest.fn().mockReturnValue(priceId),
    ensureCustomer: jest.fn().mockResolvedValue('cus_abc'),
    createCheckoutSession: jest
      .fn()
      .mockResolvedValue({ id: 'cs_test_1', url: sessionUrl }),
  };
}

function makeSubRepo(sub: any = null) {
  return { findActive: jest.fn().mockResolvedValue(sub) };
}

const BASE_INPUT = {
  userId: 'u1',
  tenantId: 't1',
  kind: 'EDUCATOR' as any,
  tier: 'PRO' as const,
  period: 'monthly' as const,
};

describe('StartCheckoutUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue({ email: 'user@test.com' });
  });

  it('Stripe yapılandırılmamışsa BadRequestException fırlatır', async () => {
    const stripe = makeStripe(false);
    const subRepo = makeSubRepo();
    const uc = new StartCheckoutUseCase(stripe as any, subRepo as any);

    await expect(uc.execute(BASE_INPUT)).rejects.toBeInstanceOf(BadRequestException);
    expect(stripe.createCheckoutSession).not.toHaveBeenCalled();
  });

  it('priceId çözülemiyorsa BadRequestException fırlatır', async () => {
    const stripe = makeStripe(true, null as any);
    const subRepo = makeSubRepo();
    const uc = new StartCheckoutUseCase(stripe as any, subRepo as any);

    await expect(uc.execute(BASE_INPUT)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('kullanıcı bulunamazsa NotFoundException fırlatır', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const stripe = makeStripe();
    const subRepo = makeSubRepo();
    const uc = new StartCheckoutUseCase(stripe as any, subRepo as any);

    await expect(uc.execute(BASE_INPUT)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('başarı senaryosunda sessionId ve url döner', async () => {
    const stripe = makeStripe();
    const subRepo = makeSubRepo();
    const uc = new StartCheckoutUseCase(stripe as any, subRepo as any);

    const result = await uc.execute(BASE_INPUT);

    expect(result.sessionId).toBe('cs_test_1');
    expect(result.url).toBe('https://checkout.stripe.com/c/123');
  });

  it('mevcut sub.customerRef varsa ensureCustomer buna geçilir', async () => {
    const stripe = makeStripe();
    const subRepo = makeSubRepo({ customerRef: 'cus_existing' });
    const uc = new StartCheckoutUseCase(stripe as any, subRepo as any);

    await uc.execute(BASE_INPUT);

    expect(stripe.ensureCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ existingCustomerRef: 'cus_existing' }),
    );
  });

  it('session.url null dönerse BadRequestException fırlatır', async () => {
    const stripe = makeStripe(true, 'price_123', null as any);
    stripe.createCheckoutSession.mockResolvedValue({ id: 'cs_null', url: null });
    const subRepo = makeSubRepo();
    const uc = new StartCheckoutUseCase(stripe as any, subRepo as any);

    await expect(uc.execute(BASE_INPUT)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('checkout session metadata tier ve period içerir', async () => {
    const stripe = makeStripe();
    const subRepo = makeSubRepo();
    const uc = new StartCheckoutUseCase(stripe as any, subRepo as any);

    await uc.execute(BASE_INPUT);

    expect(stripe.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ tier: 'PRO', period: 'monthly' }),
      }),
    );
  });
});
