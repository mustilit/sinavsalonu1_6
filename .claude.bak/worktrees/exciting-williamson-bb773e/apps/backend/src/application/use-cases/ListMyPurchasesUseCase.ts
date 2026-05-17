import { AppError } from '../errors/AppError';
import type { IPurchaseRepository, PurchaseWithAttemptRecord } from '../../domain/interfaces/IPurchaseRepository';

export class ListMyPurchasesUseCase {
  constructor(private readonly purchaseRepo: IPurchaseRepository) {}

  async execute(candidateId: string | undefined): Promise<PurchaseWithAttemptRecord[]> {
    if (!candidateId) throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
    return this.purchaseRepo.findByCandidateId(candidateId);
  }
}
