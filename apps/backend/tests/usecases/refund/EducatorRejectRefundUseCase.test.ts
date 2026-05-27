/**
 * EducatorRejectRefundUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - actorId eksik → UNAUTHORIZED
 * - Refund bulunamazsa → REFUND_NOT_FOUND
 * - Başka educator'ın refund'ı → FORBIDDEN_NOT_EDUCATOR
 * - PENDING olmayan status → REFUND_NOT_PENDING
 * - Başarı: status EDUCATOR_REJECTED, reason geçirilir, educatorDecidedAt döner
 */

import { EducatorRejectRefundUseCase } from '../../../src/application/use-cases/refund/EducatorRejectRefundUseCase';

function makeRefundRepo(refund: any) {
  return {
    findById: jest.fn().mockResolvedValue(refund),
    educatorReject: jest.fn().mockResolvedValue({
      id: 'ref-1',
      status: 'EDUCATOR_REJECTED',
      educatorDecidedAt: new Date().toISOString(),
    }),
  };
}

describe('EducatorRejectRefundUseCase', () => {
  it('actorId eksik ise UNAUTHORIZED fırlatır', async () => {
    const uc = new EducatorRejectRefundUseCase(makeRefundRepo(null) as any);
    await expect(uc.execute('ref-1', undefined)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('refund bulunamazsa REFUND_NOT_FOUND fırlatır', async () => {
    const uc = new EducatorRejectRefundUseCase(makeRefundRepo(null) as any);
    await expect(uc.execute('ref-missing', 'edu-1')).rejects.toMatchObject({ code: 'REFUND_NOT_FOUND' });
  });

  it('başka educator refund reddediyemez → FORBIDDEN_NOT_EDUCATOR', async () => {
    const refund = { id: 'ref-1', educatorId: 'edu-original', status: 'PENDING' };
    const uc = new EducatorRejectRefundUseCase(makeRefundRepo(refund) as any);
    await expect(uc.execute('ref-1', 'edu-interloper')).rejects.toMatchObject({
      code: 'FORBIDDEN_NOT_EDUCATOR',
    });
  });

  it('EDUCATOR_REJECTED status yeniden reddedilemez → REFUND_NOT_PENDING', async () => {
    const refund = { id: 'ref-1', educatorId: 'edu-1', status: 'EDUCATOR_REJECTED' };
    const repo = makeRefundRepo(refund);
    const uc = new EducatorRejectRefundUseCase(repo as any);
    await expect(uc.execute('ref-1', 'edu-1')).rejects.toMatchObject({ code: 'REFUND_NOT_PENDING' });
    expect(repo.educatorReject).not.toHaveBeenCalled();
  });

  it('başarı: educatorReject çağrılır, reason geçirilir, EDUCATOR_REJECTED döner', async () => {
    const refund = { id: 'ref-1', educatorId: 'edu-1', status: 'PENDING' };
    const repo = makeRefundRepo(refund);
    const uc = new EducatorRejectRefundUseCase(repo as any);

    const result = await uc.execute('ref-1', 'edu-1', 'Test tamamlandı');

    expect(repo.educatorReject).toHaveBeenCalledWith('ref-1', 'edu-1', 'Test tamamlandı');
    expect(result.status).toBe('EDUCATOR_REJECTED');
  });

  it('reason opsiyonel — geçirilmese de çalışır', async () => {
    const refund = { id: 'ref-1', educatorId: 'edu-1', status: 'PENDING' };
    const repo = makeRefundRepo(refund);
    const uc = new EducatorRejectRefundUseCase(repo as any);

    await expect(uc.execute('ref-1', 'edu-1')).resolves.toBeDefined();
    expect(repo.educatorReject).toHaveBeenCalledWith('ref-1', 'edu-1', undefined);
  });
});
