import { AppError } from '../errors/AppError';
import { IObjectionRepository } from '../../domain/interfaces/IObjectionRepository';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { IAuditLogRepository } from '../../domain/interfaces/IAuditLogRepository';
import { ensureEducatorActive } from '../policies/ensureEducatorActive';

const SLA_DAYS = 10;
const SLA_MS = SLA_DAYS * 24 * 60 * 60 * 1000;

export class AnswerObjectionUseCase {
  constructor(
    private readonly objectionRepo: IObjectionRepository,
    private readonly userRepo: IUserRepository,
    private readonly auditRepo: IAuditLogRepository,
  ) {}

  async execute(
    input: { objectionId: string; answerText: string },
    actorId: string | undefined,
  ): Promise<{ id: string; status: string; answerText: string; answeredAt: Date }> {
    if (!actorId) {
      throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
    }

    const user = await this.userRepo.findById(actorId);
    if (!user) throw new AppError('USER_NOT_FOUND', 'User not found', 404);
    ensureEducatorActive(user);

    const withOwner = await this.objectionRepo.findByIdWithTestOwner(input.objectionId);
    if (!withOwner) {
      throw new AppError('OBJECTION_NOT_FOUND', 'Objection not found', 404);
    }
    const { objection, educatorId } = withOwner;
    const ownerId = educatorId;
    if (ownerId == null) {
      throw new AppError('OBJECTION_OWNER_NOT_RESOLVED', 'Could not resolve test owner for this objection', 500);
    }
    if (ownerId !== actorId) {
      throw new AppError('FORBIDDEN_NOT_OWNER', 'Only the test educator can answer this objection', 403);
    }

    const answerText = input.answerText?.trim() ?? '';
    if (answerText.length < 5) {
      throw new AppError('ANSWER_TOO_SHORT', 'Answer must be at least 5 characters', 400);
    }

    const now = new Date();
    const createdAt = objection.createdAt instanceof Date ? objection.createdAt : new Date(objection.createdAt);
    const elapsedMs = now.getTime() - createdAt.getTime();
    if (elapsedMs > SLA_MS) {
      if (objection.status !== 'ESCALATED') {
        await this.objectionRepo.escalate(input.objectionId, { status: 'ESCALATED', escalatedAt: now });
        try {
          await this.auditRepo.create({
            action: 'OBJECTION_ESCALATED',
            entityType: 'OBJECTION',
            entityId: input.objectionId,
            actorId,
            metadata: { reason: 'SLA_EXPIRED' },
          });
        } catch {
          // best-effort
        }
      }
      throw new AppError('OBJECTION_SLA_EXPIRED', 'Objection SLA has expired; it has been escalated', 409);
    }

    const updated = await this.objectionRepo.updateAnswer(input.objectionId, {
      answerText,
      answeredAt: now,
      status: 'ANSWERED',
    });
    if (!updated) throw new AppError('OBJECTION_NOT_FOUND', 'Objection not found', 404);

    try {
      await this.auditRepo.create({
        action: 'OBJECTION_ANSWERED',
        entityType: 'OBJECTION',
        entityId: input.objectionId,
        actorId,
        metadata: {},
      });
    } catch {
      // best-effort
    }

    return {
      id: updated.id,
      status: updated.status,
      answerText: updated.answerText ?? answerText,
      answeredAt: updated.answeredAt ?? now,
    };
  }
}
