/**
 * CreatePortalLinkUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - Stripe devre dışıysa BadRequestException
 * - Aktif sub yoksa NotFoundException
 * - customerRef yoksa NotFoundException
 * - Başarı: stripe.createPortalLink çağrılır, url döner
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreatePortalLinkUseCase } from '../../../src/application/use-cases/billing/CreatePortalLinkUseCase';

function makeStripe(enabled = true, url = 'https://billing.stripe.com/portal/123') {
  return {
    isEnabled: jest.fn().mockReturnValue(enabled),
    createPortalLink: jest.fn().mockResolvedValue({ url }),
  };
}

function makeSubRepo(sub: any) {
  return { findActive: jest.fn().mockResolvedValue(sub) };
}

const INPUT = { userId: 'u1', tenantId: 't1', kind: 'EDUCATOR' as any };

describe('CreatePortalLinkUseCase', () => {
  it('Stripe yapılandırılmamışsa BadRequestException fırlatır', async () => {
    const stripe = makeStripe(false);
    const subRepo = makeSubRepo(null);
    const uc = new CreatePortalLinkUseCase(stripe as any, subRepo as any);

    await expect(uc.execute(INPUT)).rejects.toBeInstanceOf(BadRequestException);
    expect(stripe.createPortalLink).not.toHaveBeenCalled();
  });

  it('aktif sub yoksa NotFoundException fırlatır', async () => {
    const stripe = makeStripe(true);
    const subRepo = makeSubRepo(null);
    const uc = new CreatePortalLinkUseCase(stripe as any, subRepo as any);

    await expect(uc.execute(INPUT)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('customerRef yoksa NotFoundException fırlatır', async () => {
    const stripe = makeStripe(true);
    const subRepo = makeSubRepo({ id: 'sub-1', customerRef: null });
    const uc = new CreatePortalLinkUseCase(stripe as any, subRepo as any);

    await expect(uc.execute(INPUT)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('başarı senaryosunda stripe.createPortalLink çağrılır ve url döner', async () => {
    const stripe = makeStripe(true);
    const subRepo = makeSubRepo({ id: 'sub-2', customerRef: 'cus_abc' });
    const uc = new CreatePortalLinkUseCase(stripe as any, subRepo as any);

    const result = await uc.execute(INPUT);

    expect(stripe.createPortalLink).toHaveBeenCalledWith(
      expect.objectContaining({ customerRef: 'cus_abc' }),
    );
    expect(result.url).toBe('https://billing.stripe.com/portal/123');
  });

  it('özel returnUrl geçilirse stripe.createPortalLink returnUrl alır', async () => {
    const stripe = makeStripe(true);
    const subRepo = makeSubRepo({ id: 'sub-3', customerRef: 'cus_xyz' });
    const uc = new CreatePortalLinkUseCase(stripe as any, subRepo as any);

    await uc.execute({ ...INPUT, returnUrl: 'https://app.test/billing' });

    expect(stripe.createPortalLink).toHaveBeenCalledWith(
      expect.objectContaining({ returnUrl: 'https://app.test/billing' }),
    );
  });
});
