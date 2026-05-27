/**
 * AppealRefundUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - actorId eksik → UNAUTHORIZED
 * - Refund bulunamazsa → REFUND_NOT_FOUND
 * - Başka aday itiraz etmeye çalışırsa → FORBIDDEN_NOT_CANDIDATE
 * - PENDING status → REFUND_NOT_REJECTED (sadece EDUCATOR_REJECTED itiraz edilebilir)
 * - appealReason < 5 karakter → REASON_TOO_SHORT
 * - Başarı: status APPEAL_PENDING, appealedAt döner
 */

import { AppealRefundUseCase } from '../../../src/application/use-cases/refund/AppealRefundUseCase';
import { AppError } from '../../../src/application/errors/AppError';

function makeRefundRepo(refund: any) {
  return {
    findById: jest.fn().mockResolvedValue(refund),
    appeal: jest.fn().mockResolvedValue({
      id: 'ref-1',
      status: 'APPEAL_PENDING',
      appealedAt: new Date().toISOString(),
    }),
  };
}

describe('AppealRefundUseCase', () => {
  it('actorId eksik ise UNAUTHORIZED fırlatır', async () => {
    const refundRepo = makeRefundRepo(null);
    const uc = new AppealRefundUseCase(refundRepo as any);
    await expect(uc.execute('ref-1', undefined, 'Gerekçe metni')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });

  it('refund bulunamazsa REFUND_NOT_FOUND fırlatır', async () => {
    const refundRepo = makeRefundRepo(null);
    const uc = new AppealRefundUseCase(refundRepo as any);
    await expect(uc.execute('ref-missing', 'cand-1', 'Gerekçe metni')).rejects.toMatchObject({
      code: 'REFUND_NOT_FOUND',
    });
  });

  it('başka kullanıcı itiraz etmeye çalışırsa FORBIDDEN_NOT_CANDIDATE', async () => {
    const refund = { id: 'ref-1', candidateId: 'cand-original', status: 'EDUCATOR_REJECTED' };
    const refundRepo = makeRefundRepo(refund);
    const uc = new AppealRefundUseCase(refundRepo as any);
    await expect(uc.execute('ref-1', 'cand-other', 'Gerekçe metni')).rejects.toMatchObject({
      code: 'FORBIDDEN_NOT_CANDIDATE',
    });
  });

  it('PENDING status itiraz edilemez → REFUND_NOT_REJECTED', async () => {
    const refund = { id: 'ref-1', candidateId: 'cand-1', status: 'PENDING' };
    const refundRepo = makeRefundRepo(refund);
    const uc = new AppealRefundUseCase(refundRepo as any);
    await expect(uc.execute('ref-1', 'cand-1', 'Gerekçe metni')).rejects.toMatchObject({
      code: 'REFUND_NOT_REJECTED',
    });
    expect(refundRepo.appeal).not.toHaveBeenCalled();
  });

  it('ADMIN_APPROVED status itiraz edilemez', async () => {
    const refund = { id: 'ref-1', candidateId: 'cand-1', status: 'ADMIN_APPROVED' };
    const refundRepo = makeRefundRepo(refund);
    const uc = new AppealRefundUseCase(refundRepo as any);
    await expect(uc.execute('ref-1', 'cand-1', 'Gerekçe metni')).rejects.toMatchObject({
      code: 'REFUND_NOT_REJECTED',
    });
  });

  it('appealReason boş ise REASON_TOO_SHORT fırlatır', async () => {
    const refund = { id: 'ref-1', candidateId: 'cand-1', status: 'EDUCATOR_REJECTED' };
    const refundRepo = makeRefundRepo(refund);
    const uc = new AppealRefundUseCase(refundRepo as any);
    await expect(uc.execute('ref-1', 'cand-1', '')).rejects.toMatchObject({
      code: 'REASON_TOO_SHORT',
    });
  });

  it('appealReason 4 karakter ise REASON_TOO_SHORT fırlatır', async () => {
    const refund = { id: 'ref-1', candidateId: 'cand-1', status: 'EDUCATOR_REJECTED' };
    const refundRepo = makeRefundRepo(refund);
    const uc = new AppealRefundUseCase(refundRepo as any);
    await expect(uc.execute('ref-1', 'cand-1', 'kısa')).rejects.toMatchObject({
      code: 'REASON_TOO_SHORT',
    });
  });

  it('başarı: refundRepo.appeal çağrılır, status APPEAL_PENDING döner', async () => {
    const refund = { id: 'ref-1', candidateId: 'cand-1', status: 'EDUCATOR_REJECTED' };
    const refundRepo = makeRefundRepo(refund);
    const uc = new AppealRefundUseCase(refundRepo as any);

    const result = await uc.execute('ref-1', 'cand-1', 'Uzun gerekçe metni');

    expect(refundRepo.appeal).toHaveBeenCalledWith('ref-1', 'cand-1', 'Uzun gerekçe metni');
    expect(result.status).toBe('APPEAL_PENDING');
    expect(result.appealedAt).toBeDefined();
  });

  it('appealReason trim edilerek gönderilir', async () => {
    const refund = { id: 'ref-1', candidateId: 'cand-1', status: 'EDUCATOR_REJECTED' };
    const refundRepo = makeRefundRepo(refund);
    const uc = new AppealRefundUseCase(refundRepo as any);

    await uc.execute('ref-1', 'cand-1', '   Gerekçe metni   ');

    expect(refundRepo.appeal).toHaveBeenCalledWith('ref-1', 'cand-1', 'Gerekçe metni');
  });
});
