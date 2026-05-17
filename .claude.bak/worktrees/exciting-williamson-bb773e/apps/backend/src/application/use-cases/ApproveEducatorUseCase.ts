import { Injectable, Inject } from '@nestjs/common';
import { AppError } from '../errors/AppError';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { IAuditLogRepository } from '../../domain/interfaces/IAuditLogRepository';
import { USER_REPO, AUDIT_LOG_REPO } from '../constants';

/**
 * Admin approves an educator. Idempotent: if already ACTIVE and educatorApprovedAt set → 200 OK.
 */
@Injectable()
export class ApproveEducatorUseCase {
  constructor(
    @Inject(USER_REPO) private readonly userRepo: IUserRepository,
    @Inject(AUDIT_LOG_REPO) private readonly auditRepo: IAuditLogRepository,
  ) {}

  async execute(adminActorId: string, educatorUserId: string): Promise<{ id: string; status: string; educatorApprovedAt: Date | null }> {
    const user = await this.userRepo.findById(educatorUserId);
    if (!user) throw new AppError('USER_NOT_FOUND', 'User not found', 404);
    if (user.role !== 'EDUCATOR') throw new AppError('USER_NOT_EDUCATOR', 'User is not an educator', 409);

    if (user.status === 'ACTIVE' && user.educatorApprovedAt) {
      return { id: user.id, status: user.status, educatorApprovedAt: user.educatorApprovedAt };
    }

    const now = new Date();
    const updated = await this.userRepo.updateEducatorStatus(educatorUserId, {
      status: 'ACTIVE',
      educatorApprovedAt: now,
    });
    if (!updated) throw new AppError('USER_NOT_FOUND', 'User not found', 404);

    try {
      await this.auditRepo.create({
        action: 'EDUCATOR_APPROVED',
        entityType: 'USER',
        entityId: educatorUserId,
        actorId: adminActorId,
        metadata: {},
      });
    } catch {
      // best-effort audit
    }
    return {
      id: updated.id,
      status: updated.status,
      educatorApprovedAt: updated.educatorApprovedAt ?? null,
    };
  }
}
