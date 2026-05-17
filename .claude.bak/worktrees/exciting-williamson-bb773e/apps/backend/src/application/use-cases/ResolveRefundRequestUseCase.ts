import { IRefundRepository } from '../../domain/interfaces/IRefundRepository';
import { IAuditLogRepository } from '../../domain/interfaces/IAuditLogRepository';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

export class ResolveRefundRequestUseCase {
  constructor(private readonly refundRepo: IRefundRepository, private readonly auditRepo: IAuditLogRepository, private readonly queueService?: any) {}

  async execute(refundId: string, decision: 'APPROVED' | 'REJECTED', adminId: string) {
    if (!refundId || !decision || !adminId) throw new BadRequestException('INVALID_INPUT');
    const refund = await this.refundRepo.findById(refundId);
    if (!refund) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Refund not found' });
    if (refund.status !== 'PENDING') throw new BadRequestException({ code: 'ALREADY_RESOLVED', message: 'Refund already resolved' });

    const updated = await this.refundRepo.updateStatus(refundId, decision, adminId);

    try {
      await this.auditRepo.create({ action: decision === 'APPROVED' ? 'REFUND_APPROVED' as any : 'REFUND_REJECTED' as any, entityType: 'RefundRequest', entityId: refundId, actorId: adminId, metadata: { decision } });
    } catch {}

    // enqueue payment refund job (mock)
    if (decision === 'APPROVED' && this.queueService) {
      await this.queueService.enqueueEmail({ to: updated.candidateId, subject: 'Refund approved', body: `Refund for purchase ${updated.purchaseId} approved`, meta: { type: 'PAYMENT_REFUND', refundId } });
    }

    return updated;
  }
}

