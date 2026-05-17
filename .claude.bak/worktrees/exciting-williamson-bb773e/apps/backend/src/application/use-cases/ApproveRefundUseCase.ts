import { AppError } from '../errors/AppError';
import { IRefundRepository } from '../../domain/interfaces/IRefundRepository';
import { IAuditLogRepository } from '../../domain/interfaces/IAuditLogRepository';
import { RefundProcessor } from '../services/RefundProcessor';

export class ApproveRefundUseCase {
  constructor(
    private readonly refundRepo: IRefundRepository,
    private readonly auditRepo: IAuditLogRepository,
    private readonly processor: RefundProcessor,
  ) {}

  async execute(refundId: string, actorId: string | undefined) {
    if (!actorId) throw new AppError('UNAUTHORIZED', 'Authentication required', 401);

    const refund = await this.refundRepo.findById(refundId);
    if (!refund) throw new AppError('REFUND_NOT_FOUND', 'Refund request not found', 404);
    if (refund.status !== 'PENDING') {
      throw new AppError('REFUND_ALREADY_DECIDED', 'Refund has already been approved or rejected', 409);
    }

    const now = new Date();
    const updated = await this.refundRepo.approve(refundId, actorId, now);

    await this.processor.process(updated);

    try {
      await this.auditRepo.create({
        action: 'REFUND_APPROVED',
        entityType: 'REFUND',
        entityId: refundId,
        actorId,
        metadata: {},
      });
    } catch {
      // best-effort
    }

    const decidedAtStr = typeof updated.decidedAt === 'string' ? updated.decidedAt : (updated.decidedAt ? new Date(updated.decidedAt).toISOString() : now.toISOString());
    return { id: updated.id, status: updated.status, decidedAt: decidedAtStr };
  }
}
