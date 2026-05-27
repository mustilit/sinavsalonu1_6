/**
 * EducatorRefundsController unit testleri.
 */
import { EducatorRefundsController } from '../../../src/nest/controllers/educator.refunds.controller';

describe('EducatorRefundsController', () => {
  let controller: EducatorRefundsController;
  let mockListRefunds: { execute: jest.Mock };
  let mockApproveRefund: { execute: jest.Mock };
  let mockRejectRefund: { execute: jest.Mock };

  const refund = { id: 'ref-1', status: 'PENDING', candidateId: 'cand-1' };

  beforeEach(() => {
    mockListRefunds = { execute: jest.fn().mockResolvedValue([refund]) };
    mockApproveRefund = { execute: jest.fn().mockResolvedValue({ ...refund, status: 'EDUCATOR_APPROVED' }) };
    mockRejectRefund = { execute: jest.fn().mockResolvedValue({ ...refund, status: 'EDUCATOR_REJECTED' }) };
    controller = new EducatorRefundsController(
      mockListRefunds as any,
      mockApproveRefund as any,
      mockRejectRefund as any,
    );
  });

  describe('list', () => {
    it('educatorId ile iade taleplerini listeler', async () => {
      const req = { user: { id: 'edu-1' } };
      const result = await controller.list(req as any);
      expect(mockListRefunds.execute).toHaveBeenCalledWith('edu-1');
      expect(result).toContainEqual(refund);
    });
  });

  describe('approve', () => {
    it('iade talebini onaylar', async () => {
      const req = { user: { id: 'edu-1' } };
      const result = await controller.approve('ref-1', req as any);
      expect(mockApproveRefund.execute).toHaveBeenCalledWith('ref-1', 'edu-1');
      expect(result).toHaveProperty('status', 'EDUCATOR_APPROVED');
    });
  });

  describe('reject', () => {
    it('iade talebini reddeder', async () => {
      const body = { reason: 'Kullanım politikası' };
      const req = { user: { id: 'edu-1' } };
      const result = await controller.reject('ref-1', body as any, req as any);
      expect(mockRejectRefund.execute).toHaveBeenCalledWith('ref-1', 'edu-1', 'Kullanım politikası');
      expect(result).toHaveProperty('status', 'EDUCATOR_REJECTED');
    });

    it('reason yoksa undefined iletilir', async () => {
      const req = { user: { id: 'edu-1' } };
      await controller.reject('ref-1', {} as any, req as any);
      expect(mockRejectRefund.execute).toHaveBeenCalledWith('ref-1', 'edu-1', undefined);
    });
  });
});
