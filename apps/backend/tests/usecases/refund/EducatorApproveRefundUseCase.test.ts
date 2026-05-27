/**
 * EducatorApproveRefundUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - actorId eksik → UNAUTHORIZED
 * - Refund bulunamazsa → REFUND_NOT_FOUND
 * - Başka educator'ın refund'ı → FORBIDDEN_NOT_EDUCATOR
 * - EDUCATOR_APPROVED status → REFUND_NOT_PENDING (sadece PENDING işlenebilir)
 * - Başarı: status EDUCATOR_APPROVED, educatorDecidedAt döner
 */

import { EducatorApproveRefundUseCase } from '../../../src/application/use-cases/refund/EducatorApproveRefundUseCase';

function makeRefundRepo(refund: any) {
  return {
    findById: jest.fn().mockResolvedValue(refund),
    educatorApprove: jest.fn().mockResolvedValue({
      id: 'ref-1',
      status: 'EDUCATOR_APPROVED',
      educatorDecidedAt: new Date().toISOString(),
    }),
  };
}

describe('EducatorApproveRefundUseCase', () => {
  it('actorId eksik ise UNAUTHORIZED fırlatır', async () => {
    const uc = new EducatorApproveRefundUseCase(makeRefundRepo(null) as any);
    await expect(uc.execute('ref-1', undefined)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('refund bulunamazsa REFUND_NOT_FOUND fırlatır', async () => {
    const uc = new EducatorApproveRefundUseCase(makeRefundRepo(null) as any);
    await expect(uc.execute('ref-missing', 'edu-1')).rejects.toMatchObject({ code: 'REFUND_NOT_FOUND' });
  });

  it('başka educator refund inceleyemez → FORBIDDEN_NOT_EDUCATOR', async () => {
    const refund = { id: 'ref-1', educatorId: 'edu-original', status: 'PENDING' };
    const uc = new EducatorApproveRefundUseCase(makeRefundRepo(refund) as any);
    await expect(uc.execute('ref-1', 'edu-other')).rejects.toMatchObject({
      code: 'FORBIDDEN_NOT_EDUCATOR',
    });
  });

  it('EDUCATOR_APPROVED status PENDING değil → REFUND_NOT_PENDING', async () => {
    const refund = { id: 'ref-1', educatorId: 'edu-1', status: 'EDUCATOR_APPROVED' };
    const repo = makeRefundRepo(refund);
    const uc = new EducatorApproveRefundUseCase(repo as any);
    await expect(uc.execute('ref-1', 'edu-1')).rejects.toMatchObject({ code: 'REFUND_NOT_PENDING' });
    expect(repo.educatorApprove).not.toHaveBeenCalled();
  });

  it('APPEAL_PENDING status educator onaylayamaz', async () => {
    const refund = { id: 'ref-1', educatorId: 'edu-1', status: 'APPEAL_PENDING' };
    const uc = new EducatorApproveRefundUseCase(makeRefundRepo(refund) as any);
    await expect(uc.execute('ref-1', 'edu-1')).rejects.toMatchObject({ code: 'REFUND_NOT_PENDING' });
  });

  it('PENDING status educator onaylayabilir → EDUCATOR_APPROVED döner', async () => {
    const refund = { id: 'ref-1', educatorId: 'edu-1', status: 'PENDING' };
    const repo = makeRefundRepo(refund);
    const uc = new EducatorApproveRefundUseCase(repo as any);

    const result = await uc.execute('ref-1', 'edu-1');

    expect(repo.educatorApprove).toHaveBeenCalledWith('ref-1', 'edu-1');
    expect(result.status).toBe('EDUCATOR_APPROVED');
    expect(result.educatorDecidedAt).toBeDefined();
  });
});
