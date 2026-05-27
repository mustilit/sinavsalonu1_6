/**
 * HandleStripeWebhookUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - Duplicate event (P2002) → no-op, subRepo çağrılmaz
 * - checkout.session.completed → subRepo.upsertByProviderRef çağrılır
 * - checkout.session.completed metadata eksik → uyarı log, upsert atlanır
 * - customer.subscription.updated → subRepo.updateStatus çağrılır
 * - customer.subscription.deleted → CANCELED status set edilir
 * - invoice.paid → subRepo.updateStatus ACTIVE çağrılır
 * - invoice.payment_failed → PAST_DUE set edilir
 * - Bilinmeyen event → no-op
 */

// Prisma singleton mock — 'prisma' modülü test altında yüklenmesin
jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    webhookEvent: {
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { HandleStripeWebhookUseCase } from '../../../src/application/use-cases/billing/HandleStripeWebhookUseCase';
import { prisma } from '../../../src/infrastructure/database/prisma';

const mockPrisma = prisma as any;

// ── Yardımcı builder'lar ────────────────────────────────────────────────────

function makeSubscriptionRepo(overrides: Record<string, jest.Mock> = {}) {
  return {
    findByProviderRef: jest.fn().mockResolvedValue(null),
    upsertByProviderRef: jest.fn().mockResolvedValue({ id: 'sub-1' }),
    updateStatus: jest.fn().mockResolvedValue({}),
    findActive: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

function makeStripeService(overrides: Record<string, jest.Mock> = {}) {
  return {
    retrieveSubscription: jest.fn().mockResolvedValue({ id: 'stripe-sub-1', status: 'active', metadata: {} }),
    mapStripeSubscription: jest.fn().mockReturnValue({ tier: 'PRO', status: 'ACTIVE', providerRef: 'stripe-sub-1' }),
    mapStatus: jest.fn().mockReturnValue('ACTIVE'),
    ...overrides,
  };
}

function makeAudit() {
  return { logAsync: jest.fn(), log: jest.fn() };
}

function makeEvent(type: string, data: any, id = 'evt-1'): any {
  return { id, type, data: { object: data } };
}

// ── Testler ─────────────────────────────────────────────────────────────────

describe('HandleStripeWebhookUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Varsayılan: ilk kez görülen event (fresh)
    mockPrisma.webhookEvent.create.mockResolvedValue({ id: 'we-1' });
    mockPrisma.webhookEvent.update.mockResolvedValue({});
  });

  // ── Dedup / replay koruması ────────────────────────────────────────────────

  it('aynı event.id ikinci gelince (P2002) no-op döner, subRepo çağrılmaz', async () => {
    const subRepo = makeSubscriptionRepo();
    const stripe = makeStripeService();
    const audit = makeAudit();

    // P2002 → duplicate
    const dupError: any = new Error('unique');
    dupError.code = 'P2002';
    mockPrisma.webhookEvent.create.mockRejectedValue(dupError);

    const uc = new HandleStripeWebhookUseCase(subRepo as any, stripe as any, audit as any);

    await uc.execute(makeEvent('checkout.session.completed', {}, 'evt-dup'));

    expect(subRepo.upsertByProviderRef).not.toHaveBeenCalled();
    expect(subRepo.updateStatus).not.toHaveBeenCalled();
  });

  it('webhookEvent.create farklı hata fırlatırsa re-throw edilir', async () => {
    const subRepo = makeSubscriptionRepo();
    const stripe = makeStripeService();
    const audit = makeAudit();

    mockPrisma.webhookEvent.create.mockRejectedValue(new Error('DB_DOWN'));

    const uc = new HandleStripeWebhookUseCase(subRepo as any, stripe as any, audit as any);

    await expect(uc.execute(makeEvent('invoice.paid', {}, 'evt-err'))).rejects.toThrow('DB_DOWN');
  });

  // ── checkout.session.completed ────────────────────────────────────────────

  it('checkout.session.completed → subRepo.upsertByProviderRef çağrılır', async () => {
    const subRepo = makeSubscriptionRepo();
    const stripe = makeStripeService();
    const audit = makeAudit();

    const session = {
      mode: 'subscription',
      subscription: 'stripe-sub-1',
      metadata: { tenantId: 't1', subscriberId: 'u1', kind: 'EDUCATOR' },
    };

    const uc = new HandleStripeWebhookUseCase(subRepo as any, stripe as any, audit as any);
    await uc.execute(makeEvent('checkout.session.completed', session));

    expect(stripe.retrieveSubscription).toHaveBeenCalledWith('stripe-sub-1');
    expect(subRepo.upsertByProviderRef).toHaveBeenCalledTimes(1);
  });

  it('checkout.session.completed mode=payment → subRepo çağrılmaz', async () => {
    const subRepo = makeSubscriptionRepo();
    const stripe = makeStripeService();
    const audit = makeAudit();

    const session = { mode: 'payment', subscription: null, metadata: {} };

    const uc = new HandleStripeWebhookUseCase(subRepo as any, stripe as any, audit as any);
    await uc.execute(makeEvent('checkout.session.completed', session));

    expect(subRepo.upsertByProviderRef).not.toHaveBeenCalled();
  });

  it('checkout.session.completed metadata tenantId eksik → upsert atlanır', async () => {
    const subRepo = makeSubscriptionRepo();
    const stripe = makeStripeService();
    const audit = makeAudit();

    const session = {
      mode: 'subscription',
      subscription: 'stripe-sub-2',
      metadata: { subscriberId: 'u1' }, // tenantId yok
    };

    const uc = new HandleStripeWebhookUseCase(subRepo as any, stripe as any, audit as any);
    await uc.execute(makeEvent('checkout.session.completed', session, 'evt-nometa'));

    expect(subRepo.upsertByProviderRef).not.toHaveBeenCalled();
  });

  // ── customer.subscription.updated ─────────────────────────────────────────

  it('customer.subscription.updated mevcut kayıt varsa updateStatus çağrılır', async () => {
    const existing = { id: 'sub-db-1', subscriberId: 'u1', tenantId: 't1', status: 'ACTIVE' };
    const subRepo = makeSubscriptionRepo({
      findByProviderRef: jest.fn().mockResolvedValue(existing),
    });
    const stripe = makeStripeService();
    const audit = makeAudit();

    const stripeSub = {
      id: 'stripe-sub-1',
      status: 'active',
      cancel_at_period_end: false,
      canceled_at: null,
      metadata: {},
    };

    const uc = new HandleStripeWebhookUseCase(subRepo as any, stripe as any, audit as any);
    await uc.execute(makeEvent('customer.subscription.updated', stripeSub));

    expect(subRepo.updateStatus).toHaveBeenCalledWith(
      'sub-db-1',
      'ACTIVE',
      expect.objectContaining({ cancelAtPeriodEnd: false }),
    );
  });

  it('customer.subscription.updated kayıt yoksa metadata ile upsert dener', async () => {
    const subRepo = makeSubscriptionRepo({
      findByProviderRef: jest.fn().mockResolvedValue(null),
    });
    const stripe = makeStripeService();
    const audit = makeAudit();

    const stripeSub = {
      id: 'stripe-new-1',
      status: 'active',
      cancel_at_period_end: false,
      canceled_at: null,
      metadata: { tenantId: 't1', subscriberId: 'u2', kind: 'EDUCATOR' },
    };

    const uc = new HandleStripeWebhookUseCase(subRepo as any, stripe as any, audit as any);
    await uc.execute(makeEvent('customer.subscription.updated', stripeSub));

    expect(subRepo.upsertByProviderRef).toHaveBeenCalledTimes(1);
  });

  // ── customer.subscription.deleted ─────────────────────────────────────────

  it('customer.subscription.deleted → status CANCELED set edilir', async () => {
    const existing = { id: 'sub-db-2', subscriberId: 'u1', tenantId: 't1', status: 'ACTIVE' };
    const subRepo = makeSubscriptionRepo({
      findByProviderRef: jest.fn().mockResolvedValue(existing),
    });
    const stripe = makeStripeService();
    const audit = makeAudit();

    const uc = new HandleStripeWebhookUseCase(subRepo as any, stripe as any, audit as any);
    await uc.execute(makeEvent('customer.subscription.deleted', { id: 'stripe-sub-2', metadata: {} }));

    expect(subRepo.updateStatus).toHaveBeenCalledWith(
      'sub-db-2',
      'CANCELED',
      expect.objectContaining({ cancelAtPeriodEnd: false }),
    );
  });

  it('customer.subscription.deleted kayıt yoksa updateStatus çağrılmaz', async () => {
    const subRepo = makeSubscriptionRepo({
      findByProviderRef: jest.fn().mockResolvedValue(null),
    });
    const audit = makeAudit();
    const stripe = makeStripeService();

    const uc = new HandleStripeWebhookUseCase(subRepo as any, stripe as any, audit as any);
    await uc.execute(makeEvent('customer.subscription.deleted', { id: 'stripe-ghost' }));

    expect(subRepo.updateStatus).not.toHaveBeenCalled();
  });

  // ── invoice.paid ───────────────────────────────────────────────────────────

  it('invoice.paid → mevcut sub PAST_DUE ise ACTIVE yapılır', async () => {
    const existing = { id: 'sub-db-3', subscriberId: 'u1', tenantId: 't1', status: 'PAST_DUE' };
    const subRepo = makeSubscriptionRepo({
      findByProviderRef: jest.fn().mockResolvedValue(existing),
    });
    const stripe = makeStripeService();
    const audit = makeAudit();

    const invoice = {
      id: 'inv-1',
      subscription: 'stripe-sub-1',
      amount_paid: 9900,
      currency: 'try',
    };

    const uc = new HandleStripeWebhookUseCase(subRepo as any, stripe as any, audit as any);
    await uc.execute(makeEvent('invoice.paid', invoice));

    expect(subRepo.updateStatus).toHaveBeenCalledWith('sub-db-3', 'ACTIVE');
  });

  it('invoice.paid → sub zaten ACTIVE ise updateStatus çağrılmaz', async () => {
    const existing = { id: 'sub-db-4', subscriberId: 'u1', tenantId: 't1', status: 'ACTIVE' };
    const subRepo = makeSubscriptionRepo({
      findByProviderRef: jest.fn().mockResolvedValue(existing),
    });
    const stripe = makeStripeService();
    const audit = makeAudit();

    const invoice = { id: 'inv-2', subscription: 'stripe-sub-1', amount_paid: 9900, currency: 'try' };

    const uc = new HandleStripeWebhookUseCase(subRepo as any, stripe as any, audit as any);
    await uc.execute(makeEvent('invoice.paid', invoice));

    expect(subRepo.updateStatus).not.toHaveBeenCalled();
  });

  // ── invoice.payment_failed ─────────────────────────────────────────────────

  it('invoice.payment_failed → sub PAST_DUE yapılır', async () => {
    const existing = { id: 'sub-db-5', subscriberId: 'u1', tenantId: 't1', status: 'ACTIVE' };
    const subRepo = makeSubscriptionRepo({
      findByProviderRef: jest.fn().mockResolvedValue(existing),
    });
    const stripe = makeStripeService();
    const audit = makeAudit();

    const invoice = { id: 'inv-fail-1', subscription: 'stripe-sub-5', amount_due: 9900 };

    const uc = new HandleStripeWebhookUseCase(subRepo as any, stripe as any, audit as any);
    await uc.execute(makeEvent('invoice.payment_failed', invoice));

    expect(subRepo.updateStatus).toHaveBeenCalledWith('sub-db-5', 'PAST_DUE');
  });

  // ── trial_will_end + bilinmeyen event ─────────────────────────────────────

  it('customer.subscription.trial_will_end → subRepo çağrılmaz', async () => {
    const subRepo = makeSubscriptionRepo();
    const stripe = makeStripeService();
    const audit = makeAudit();

    const uc = new HandleStripeWebhookUseCase(subRepo as any, stripe as any, audit as any);
    await uc.execute(makeEvent('customer.subscription.trial_will_end', { id: 'stripe-trial' }));

    expect(subRepo.updateStatus).not.toHaveBeenCalled();
    expect(subRepo.upsertByProviderRef).not.toHaveBeenCalled();
  });

  it('bilinmeyen event → hata fırlatılmaz, subRepo çağrılmaz', async () => {
    const subRepo = makeSubscriptionRepo();
    const stripe = makeStripeService();
    const audit = makeAudit();

    const uc = new HandleStripeWebhookUseCase(subRepo as any, stripe as any, audit as any);

    await expect(
      uc.execute(makeEvent('payment.intent.created', {})),
    ).resolves.toBeUndefined();

    expect(subRepo.updateStatus).not.toHaveBeenCalled();
  });
});
