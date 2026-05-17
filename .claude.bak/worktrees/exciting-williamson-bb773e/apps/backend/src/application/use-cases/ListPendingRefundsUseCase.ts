import type { RefundListItem } from '../../domain/interfaces/IRefundRepository';
import type { IRefundRepository } from '../../domain/interfaces/IRefundRepository';

export class ListPendingRefundsUseCase {
  constructor(private readonly refundRepo: IRefundRepository) {}

  async execute(status: 'PENDING' | 'APPROVED' | 'REJECTED'): Promise<RefundListItem[]> {
    return this.refundRepo.findByStatus(status);
  }
}
