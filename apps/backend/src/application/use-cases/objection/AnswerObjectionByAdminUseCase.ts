import { AppError } from '../../errors/AppError';
import { IObjectionRepository } from '../../../domain/interfaces/IObjectionRepository';
import { IAuditLogRepository } from '../../../domain/interfaces/IAuditLogRepository';

/**
 * Admin'in bir itiraza bağımsız olarak yanıt yazmasını sağlar.
 *
 * Eğitici yanıtından (answerText) FARKLI ve ayrı bir alana yazılır
 * (adminAnswerText). Eğiticinin yanıt verip vermediğine bakılmaksızın
 * çağrılabilir; itirazın `status` alanını DEĞİŞTİRMEZ — sadece notu/yanıtı
 * ekler. Admin tekrar çağırırsa mevcut admin yanıtı üzerine yazar.
 */
export class AnswerObjectionByAdminUseCase {
  constructor(
    private readonly objectionRepo: IObjectionRepository,
    private readonly auditRepo: IAuditLogRepository,
  ) {}

  async execute(
    input: { objectionId: string; adminAnswerText: string },
    actorId: string | undefined,
  ): Promise<{
    id: string;
    adminAnswerText: string;
    adminAnsweredAt: Date;
    adminAnswererId: string;
  }> {
    if (!actorId) {
      throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
    }

    const text = input.adminAnswerText?.trim() ?? '';
    if (text.length < 5) {
      throw new AppError('ADMIN_ANSWER_TOO_SHORT', 'Admin answer must be at least 5 characters', 400);
    }

    const objection = await this.objectionRepo.findById(input.objectionId);
    if (!objection) {
      throw new AppError('OBJECTION_NOT_FOUND', 'Objection not found', 404);
    }

    const now = new Date();
    const updated = await this.objectionRepo.updateAdminAnswer(input.objectionId, {
      adminAnswerText: text,
      adminAnsweredAt: now,
      adminAnswererId: actorId,
    });
    if (!updated) {
      throw new AppError('OBJECTION_NOT_FOUND', 'Objection not found', 404);
    }

    try {
      await this.auditRepo.create({
        action: 'OBJECTION_ANSWERED' as any,
        entityType: 'OBJECTION',
        entityId: input.objectionId,
        actorId,
        metadata: { byAdmin: true },
      });
    } catch {
      // best-effort: audit log hatası ana akışı kesmez
    }

    return {
      id: updated.id,
      adminAnswerText: updated.adminAnswerText ?? text,
      adminAnsweredAt: updated.adminAnsweredAt ?? now,
      adminAnswererId: updated.adminAnswererId ?? actorId,
    };
  }
}
