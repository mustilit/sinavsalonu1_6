/**
 * HandleIyzicoWebhookUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - Duplicate event (P2002) → no-op
 * - payment.success → purchase.paymentStatus = PAID
 * - payment.failure → purchase.paymentStatus = FAILED
 * - conversationId eksik → skip
 * - Handler hatası → markFailed çağrılır, re-throw
 */

// Prisma singleton mock
jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    webhookEvent: {
      create: jest.fn(),
      update: jest.fn(),
    },
    purchase: {
      update: jest.fn(),
    },
  },
}));

import { HandleIyzicoWebhookUseCase } from '../../../src/application/use-cases/billing/HandleIyzicoWebhookUseCase';
import { prisma } from '../../../src/infrastructure/database/prisma';

const mockPrisma = prisma as any;

function makeAudit() {
  return { logAsync: jest.fn(), log: jest.fn() };
}

describe('HandleIyzicoWebhookUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.webhookEvent.create.mockResolvedValue({ id: 'we-1' });
    mockPrisma.webhookEvent.update.mockResolvedValue({});
    mockPrisma.purchase.update.mockResolvedValue({ id: 'pur-1', candidateId: 'u1', tenantId: 't1' });
  });

  // ── Dedup ──────────────────────────────────────────────────────────────────

  it('aynı paymentId ikinci gelince (P2002) no-op döner, purchase update olmaz', async () => {
    const dupErr: any = new Error('unique');
    dupErr.code = 'P2002';
    mockPrisma.webhookEvent.create.mockRejectedValue(dupErr);

    const uc = new HandleIyzicoWebhookUseCase(makeAudit() as any);
    await uc.execute({ paymentId: 'pay-1', status: 'SUCCESS', conversationId: 'pur-1' });

    expect(mockPrisma.purchase.update).not.toHaveBeenCalled();
  });

  // ── payment.success ────────────────────────────────────────────────────────

  it('status=SUCCESS → purchase.paymentStatus PAID yapılır', async () => {
    const uc = new HandleIyzicoWebhookUseCase(makeAudit() as any);
    await uc.execute({ paymentId: 'pay-2', status: 'SUCCESS', conversationId: 'pur-2' });

    expect(mockPrisma.purchase.update).toHaveBeenCalledWith({
      where: { id: 'pur-2' },
      data: { paymentStatus: 'PAID' },
    });
  });

  it('eventType=payment.success → purchase.paymentStatus PAID yapılır', async () => {
    const uc = new HandleIyzicoWebhookUseCase(makeAudit() as any);
    await uc.execute({ paymentId: 'pay-3', eventType: 'payment.success', conversationId: 'pur-3' });

    expect(mockPrisma.purchase.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { paymentStatus: 'PAID' } }),
    );
  });

  // ── payment.failure ────────────────────────────────────────────────────────

  it('status=FAILURE → purchase.paymentStatus FAILED yapılır', async () => {
    const uc = new HandleIyzicoWebhookUseCase(makeAudit() as any);
    await uc.execute({ paymentId: 'pay-4', status: 'FAILURE', conversationId: 'pur-4' });

    expect(mockPrisma.purchase.update).toHaveBeenCalledWith({
      where: { id: 'pur-4' },
      data: { paymentStatus: 'FAILED' },
    });
  });

  // ── conversationId eksik ───────────────────────────────────────────────────

  it('conversationId yoksa purchase.update çağrılmaz', async () => {
    const uc = new HandleIyzicoWebhookUseCase(makeAudit() as any);
    await uc.execute({ paymentId: 'pay-5', status: 'SUCCESS' }); // conversationId yok

    expect(mockPrisma.purchase.update).not.toHaveBeenCalled();
  });

  // ── Handler hatası ─────────────────────────────────────────────────────────

  it('purchase.update hata fırlatırsa markFailed çağrılır ve hata re-throw edilir', async () => {
    mockPrisma.purchase.update.mockRejectedValue(new Error('DB_FAIL'));

    const uc = new HandleIyzicoWebhookUseCase(makeAudit() as any);
    await expect(
      uc.execute({ paymentId: 'pay-err', status: 'SUCCESS', conversationId: 'pur-err' }),
    ).rejects.toThrow('DB_FAIL');

    // markFailed → webhookEvent.update çağrılır (best-effort)
    expect(mockPrisma.webhookEvent.update).toHaveBeenCalled();
  });

  // ── eventId fallback ───────────────────────────────────────────────────────

  it('paymentId yoksa iyziReferenceCode eventId olarak kullanılır', async () => {
    const uc = new HandleIyzicoWebhookUseCase(makeAudit() as any);
    await uc.execute({ iyziReferenceCode: 'ref-001', status: 'SUCCESS', conversationId: 'pur-6' });

    expect(mockPrisma.webhookEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ providerEventId: 'ref-001' }),
      }),
    );
  });
});
