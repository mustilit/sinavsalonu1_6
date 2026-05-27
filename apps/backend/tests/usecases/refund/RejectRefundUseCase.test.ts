/**
 * RejectRefundUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - actorId eksik → UNAUTHORIZED
 * - Refund bulunamazsa → REFUND_NOT_FOUND
 * - PENDING status → REFUND_NOT_ACTIONABLE (admin sadece EDUCATOR_APPROVED/APPEAL_PENDING/ESCALATED reddedebilir)
 * - Başarı: refundRepo.reject çağrılır, audit log yazılır, id+status+decidedAt döner
 * - Audit log hatası main flow'u kesmez
 */

import { RejectRefundUseCase } from '../../../src/application/use-cases/refund/RejectRefundUseCase';
import { AppError } from '../../../src/application/errors/AppError';

function makeRefundRepo(refund: any) {
  return {
    findById: jest.fn().mockResolvedValue(refund),
    reject: jest.fn().mockResolvedValue({
      id: 'ref-1',
      status: 'ADMIN_REJECTED',
      decidedAt: new Date().toISOString(),
    }),
  };
}

function makeAuditRepo() {
  return { create: jest.fn().mockResolvedValue({}) };
}

describe('RejectRefundUseCase', () => {
  it('actorId eksik ise UNAUTHORIZED fırlatır', async () => {
    const refundRepo = makeRefundRepo(null);
    const uc = new RejectRefundUseCase(refundRepo as any, makeAuditRepo() as any);
    await expect(uc.execute('ref-1', undefined)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('refund bulunamazsa REFUND_NOT_FOUND fırlatır', async () => {
    const refundRepo = makeRefundRepo(null);
    const uc = new RejectRefundUseCase(refundRepo as any, makeAuditRepo() as any);
    await expect(uc.execute('ref-missing', 'admin-1')).rejects.toMatchObject({ code: 'REFUND_NOT_FOUND' });
  });

  it('PENDING status admin reddine uygun değil → REFUND_NOT_ACTIONABLE', async () => {
    const refundRepo = makeRefundRepo({ id: 'ref-1', status: 'PENDING' });
    const uc = new RejectRefundUseCase(refundRepo as any, makeAuditRepo() as any);
    await expect(uc.execute('ref-1', 'admin-1')).rejects.toMatchObject({ code: 'REFUND_NOT_ACTIONABLE' });
    expect(refundRepo.reject).not.toHaveBeenCalled();
  });

  it('ADMIN_REJECTED status da admin reddine uygun değil', async () => {
    const refundRepo = makeRefundRepo({ id: 'ref-1', status: 'ADMIN_REJECTED' });
    const uc = new RejectRefundUseCase(refundRepo as any, makeAuditRepo() as any);
    await expect(uc.execute('ref-1', 'admin-1')).rejects.toMatchObject({ code: 'REFUND_NOT_ACTIONABLE' });
  });

  it('EDUCATOR_APPROVED status admin reddedebilir → refundRepo.reject çağrılır', async () => {
    const refundRepo = makeRefundRepo({ id: 'ref-1', status: 'EDUCATOR_APPROVED' });
    const auditRepo = makeAuditRepo();
    const uc = new RejectRefundUseCase(refundRepo as any, auditRepo as any);

    const result = await uc.execute('ref-1', 'admin-1', 'Geçersiz istek');

    expect(refundRepo.reject).toHaveBeenCalledWith('ref-1', 'admin-1', expect.any(Date), 'Geçersiz istek');
    expect(result.status).toBe('ADMIN_REJECTED');
  });

  it('APPEAL_PENDING status admin reddedebilir', async () => {
    const refundRepo = makeRefundRepo({ id: 'ref-2', status: 'APPEAL_PENDING' });
    const uc = new RejectRefundUseCase(refundRepo as any, makeAuditRepo() as any);
    const result = await uc.execute('ref-2', 'admin-1');
    expect(refundRepo.reject).toHaveBeenCalledTimes(1);
    expect(result.id).toBe('ref-1');
  });

  it('ESCALATED status admin reddedebilir', async () => {
    const refundRepo = makeRefundRepo({ id: 'ref-3', status: 'ESCALATED' });
    const uc = new RejectRefundUseCase(refundRepo as any, makeAuditRepo() as any);
    await expect(uc.execute('ref-3', 'admin-1')).resolves.toBeDefined();
    expect(refundRepo.reject).toHaveBeenCalledTimes(1);
  });

  it('audit log hatası main flow u kesmez', async () => {
    const refundRepo = makeRefundRepo({ id: 'ref-4', status: 'EDUCATOR_APPROVED' });
    const auditRepo = { create: jest.fn().mockRejectedValue(new Error('AUDIT_FAIL')) };
    const uc = new RejectRefundUseCase(refundRepo as any, auditRepo as any);

    const result = await uc.execute('ref-4', 'admin-1');
    expect(result.id).toBe('ref-1'); // başarıyla döner
  });

  it('decidedAt string olarak normalize edilir', async () => {
    const refundRepo = makeRefundRepo({ id: 'ref-5', status: 'EDUCATOR_APPROVED' });
    refundRepo.reject.mockResolvedValue({
      id: 'ref-5',
      status: 'ADMIN_REJECTED',
      decidedAt: new Date('2026-01-15T10:00:00Z'),
    });
    const uc = new RejectRefundUseCase(refundRepo as any, makeAuditRepo() as any);

    const result = await uc.execute('ref-5', 'admin-1');
    expect(result.decidedAt).toBe('2026-01-15T10:00:00.000Z');
  });
});
