import { AppError } from '../errors/AppError';
import { IRefundRepository } from '../../domain/interfaces/IRefundRepository';
import { IPurchaseRepository } from '../../domain/interfaces/IPurchaseRepository';
import { IAttemptRepository } from '../../domain/interfaces/IAttemptRepository';
import { IAuditLogRepository } from '../../domain/interfaces/IAuditLogRepository';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REFUND_WINDOW_DAYS = 7;
const REFUND_WINDOW_MS = REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export class RequestRefundUseCase {
  constructor(
    private readonly refundRepo: IRefundRepository,
    private readonly purchaseRepo: IPurchaseRepository,
    private readonly attemptRepo: IAttemptRepository,
    private readonly auditRepo: IAuditLogRepository,
  ) {}

  async execute(
    input: { purchaseId: string; reason?: string },
    actorId: string | undefined,
  ): Promise<{ id: string; purchaseId: string; candidateId: string; testId: string; reason: string | null; status: string; createdAt: string }> {
    if (!actorId) {
      throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
    }
    if (!UUID_REGEX.test(input.purchaseId)) {
      throw new AppError('INVALID_UUID', 'Invalid purchaseId', 400);
    }

    const purchase = await this.purchaseRepo.findById(input.purchaseId);
    if (!purchase) {
      throw new AppError('PURCHASE_NOT_FOUND', 'Purchase not found', 404);
    }
    if (purchase.candidateId !== actorId) {
      throw new AppError('FORBIDDEN_NOT_OWNER', 'Only the purchase owner can request a refund', 403);
    }

    const elapsedMs = Date.now() - new Date(purchase.createdAt).getTime();
    if (elapsedMs > REFUND_WINDOW_MS) {
      throw new AppError('REFUND_WINDOW_EXPIRED', 'Refund window has expired (7 days from purchase)', 409);
    }

    const hasAttempt = await this.attemptRepo.hasAnyAttempt(purchase.testId, actorId);
    if (hasAttempt) {
      throw new AppError('REFUND_NOT_ALLOWED_ATTEMPT_STARTED', 'Refund not allowed: you have already started an attempt for this test', 409);
    }

    const existing = await this.refundRepo.findByPurchaseId(input.purchaseId);
    if (existing) {
      throw new AppError('REFUND_ALREADY_REQUESTED', 'A refund has already been requested for this purchase', 409);
    }

    const reason = input.reason?.trim();
    if (reason != null && reason !== '' && reason.length < 5) {
      throw new AppError('REASON_TOO_SHORT', 'Reason must be at least 5 characters if provided', 400);
    }

    const created = await this.refundRepo.create({
      purchaseId: input.purchaseId,
      candidateId: actorId,
      testId: purchase.testId,
      reason: reason ?? undefined,
    });

    try {
      await this.auditRepo.create({
        action: 'REFUND_REQUESTED',
        entityType: 'REFUND',
        entityId: created.id,
        actorId,
        metadata: { purchaseId: input.purchaseId, testId: purchase.testId },
      });
    } catch {
      // best-effort
    }

    return {
      id: created.id,
      purchaseId: created.purchaseId,
      candidateId: created.candidateId,
      testId: created.testId,
      reason: created.reason ?? null,
      status: created.status,
      createdAt: typeof created.createdAt === 'string' ? created.createdAt : new Date(created.createdAt).toISOString(),
    };
  }
}
