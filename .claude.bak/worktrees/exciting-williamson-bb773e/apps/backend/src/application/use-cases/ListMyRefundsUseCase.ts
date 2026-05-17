import { AppError } from '../errors/AppError';
import type { RefundListItem } from '../../domain/interfaces/IRefundRepository';
import type { IRefundRepository } from '../../domain/interfaces/IRefundRepository';

export class ListMyRefundsUseCase {
  constructor(private readonly refundRepo: IRefundRepository) {}

  async execute(actorId: string | undefined): Promise<RefundListItem[]> {
    if (!actorId) throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
    return this.refundRepo.findByCandidateId(actorId);
  }
}
