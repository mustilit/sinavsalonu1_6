/**
 * GetMySubscriptionUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - Aktif sub yoksa tier=FREE, status=null döner
 * - Aktif sub varsa doğru alanlar döner
 * - customerRef varsa hasPaymentMethod=true
 * - trialEndsAt ve cancelAtPeriodEnd doğru yansır
 */

import { GetMySubscriptionUseCase } from '../../../src/application/use-cases/billing/GetMySubscriptionUseCase';

function makeSubRepo(sub: any) {
  return {
    findActive: jest.fn().mockResolvedValue(sub),
  };
}

const INPUT = { userId: 'u1', tenantId: 't1', kind: 'EDUCATOR' as any };

describe('GetMySubscriptionUseCase', () => {
  it('aktif sub yoksa FREE tier ve null status döner', async () => {
    const subRepo = makeSubRepo(null);
    const uc = new GetMySubscriptionUseCase(subRepo as any);

    const result = await uc.execute(INPUT);

    expect(result.tier).toBe('FREE');
    expect(result.status).toBeNull();
    expect(result.hasPaymentMethod).toBe(false);
    expect(result.cancelAtPeriodEnd).toBe(false);
  });

  it('PRO aktif sub doğru tier ve status döner', async () => {
    const sub = {
      tier: 'PRO',
      status: 'ACTIVE',
      currentPeriodEnd: new Date('2026-12-31'),
      cancelAtPeriodEnd: false,
      trialEndsAt: null,
      customerRef: 'cus_stripe_123',
    };
    const subRepo = makeSubRepo(sub);
    const uc = new GetMySubscriptionUseCase(subRepo as any);

    const result = await uc.execute(INPUT);

    expect(result.tier).toBe('PRO');
    expect(result.status).toBe('ACTIVE');
    expect(result.hasPaymentMethod).toBe(true);
    expect(result.currentPeriodEnd).toEqual(new Date('2026-12-31'));
  });

  it('customerRef yoksa hasPaymentMethod=false', async () => {
    const sub = {
      tier: 'BUSINESS',
      status: 'TRIALING',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      trialEndsAt: new Date('2026-06-30'),
      customerRef: null,
    };
    const subRepo = makeSubRepo(sub);
    const uc = new GetMySubscriptionUseCase(subRepo as any);

    const result = await uc.execute(INPUT);

    expect(result.hasPaymentMethod).toBe(false);
    expect(result.trialEndsAt).toEqual(new Date('2026-06-30'));
  });

  it('cancelAtPeriodEnd=true doğru yansır', async () => {
    const sub = {
      tier: 'PRO',
      status: 'ACTIVE',
      currentPeriodEnd: new Date('2026-07-01'),
      cancelAtPeriodEnd: true,
      trialEndsAt: null,
      customerRef: 'cus_abc',
    };
    const subRepo = makeSubRepo(sub);
    const uc = new GetMySubscriptionUseCase(subRepo as any);

    const result = await uc.execute(INPUT);

    expect(result.cancelAtPeriodEnd).toBe(true);
  });

  it('findActive doğru kind ile çağrılır', async () => {
    const subRepo = makeSubRepo(null);
    const uc = new GetMySubscriptionUseCase(subRepo as any);

    await uc.execute({ userId: 'u2', tenantId: 't2', kind: 'EDUCATOR' });

    expect(subRepo.findActive).toHaveBeenCalledWith({
      kind: 'EDUCATOR',
      subscriberId: 'u2',
      tenantId: 't2',
    });
  });
});
