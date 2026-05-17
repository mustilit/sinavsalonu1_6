import { IRefundRepository } from '../../domain/interfaces/IRefundRepository';
import { IObjectionRepository } from '../../domain/interfaces/IObjectionRepository';
import { IAuditLogRepository } from '../../domain/interfaces/IAuditLogRepository';
import { BadRequestException, ConflictException } from '@nestjs/common';

export class CreateRefundRequestUseCase {
  constructor(private readonly refundRepo: IRefundRepository, private readonly objectionRepo: IObjectionRepository, private readonly auditRepo: IAuditLogRepository) {}

  async execute(purchaseId: string, candidateId: string, reason?: string) {
    if (!purchaseId || !candidateId) throw new BadRequestException('INVALID_INPUT');

    // check existing refund
    const existing = await this.refundRepo.findByPurchaseId(purchaseId);
    if (existing) throw new ConflictException({ code: 'REFUND_EXISTS', message: 'Refund already requested for this purchase' });

    // check objections count >=10
    const purchaseRefundAllowed = await this.objectionRepo.countByTestAndCandidate((await this.getTestIdFromPurchase(purchaseId)), candidateId);
    if (purchaseRefundAllowed < 10) throw new BadRequestException({ code: 'NOT_ELIGIBLE_FOR_REFUND', message: 'Not enough objections' });

    // create refund
    const testId = await this.getTestIdFromPurchase(purchaseId);
    const created = await this.refundRepo.create({ purchaseId, candidateId, testId, reason });

    // audit
    try {
      await this.auditRepo.create({ action: 'REFUND_REQUESTED' as any, entityType: 'RefundRequest', entityId: created.id, actorId: candidateId, metadata: { purchaseId, testId } });
    } catch {}

    return created;
  }

  private async getTestIdFromPurchase(purchaseId: string) {
    // lightweight direct prisma access to purchase
    const { prisma } = require('../../infrastructure/database/prisma');
    const p = await prisma.purchase.findUnique({ where: { id: purchaseId } });
    if (!p) throw new BadRequestException({ code: 'PURCHASE_NOT_FOUND', message: 'Purchase not found' });
    return p.testId;
  }
}

