import { AppError } from '../errors/AppError';
import { IRefundRepository } from '../../domain/interfaces/IRefundRepository';
import { IAuditLogRepository } from '../../domain/interfaces/IAuditLogRepository';

export class RejectRefundUseCase {
  constructor(
    private readonly refundRepo: IRefundRepository,
    private readonly auditRepo: IAuditLogRepository,
  ) {}

  async execute(
    refundId: string,
    actorId: string | undefined,
    reason?: string,
  ): Promise<{ id: string; status: string; decidedAt: string }> {
    if (!actorId) throw new AppError('UNAUTHORIZED', 'Authentication required', 401);

    const refund = await this.refundRepo.findById(refundId);
    if (!refund) throw new AppError('REFUND_NOT_FOUND', 'Refund request not found', 404);
    if (refund.status !== 'PENDING') {
      throw new AppError('REFUND_ALREADY_DECIDED', 'Refund has already been approved or rejected', 409);
    }

    const now = new Date();
    const updated = await this.refundRepo.reject(refundId, actorId, now, reason);

    try {
      await this.auditRepo.create({
        action: 'REFUND_REJECTED',
        entityType: 'REFUND',
        entityId: refundId,
        actorId,
        metadata: reason ? { reason } : {},
      });
    } catch {
      // best-effort
    }

    return {
      id: updated.id,
      status: updated.status,
      decidedAt: typeof updated.decidedAt === 'string' ? updated.decidedAt : (updated.decidedAt ? new Date(updated.decidedAt).toISOString() : now.toISOString()),
    };
  }
}
