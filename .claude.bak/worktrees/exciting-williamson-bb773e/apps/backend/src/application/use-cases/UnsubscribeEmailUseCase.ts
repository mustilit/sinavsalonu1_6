import { INotificationPreferenceRepository } from '../../domain/interfaces/INotificationPreferenceRepository';
import { PrismaAuditLogRepository } from '../../infrastructure/repositories/PrismaAuditLogRepository';

export class UnsubscribeEmailUseCase {
  constructor(private readonly repo: INotificationPreferenceRepository, private readonly auditRepo: PrismaAuditLogRepository) {}

  async execute(token: string) {
    const ok = await this.repo.disableByToken(token);
    if (ok) {
      await this.auditRepo.create({
        action: 'NOTIFICATIONS_DISABLED',
        entityType: 'NotificationPreference',
        entityId: token,
        actorId: null,
        metadata: { reason: 'unsubscribe' },
      } as any);
    }
    return ok;
  }
}

