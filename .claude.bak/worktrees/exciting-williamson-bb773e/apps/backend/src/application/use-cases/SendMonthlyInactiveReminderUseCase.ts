import { INotificationPreferenceRepository } from '../../domain/interfaces/INotificationPreferenceRepository';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { PrismaAuditLogRepository } from '../../infrastructure/repositories/PrismaAuditLogRepository';
import { QueueService } from '../../infrastructure/queue/queue.service';

export class SendMonthlyInactiveReminderUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly prefRepo: INotificationPreferenceRepository,
    private readonly queueService: QueueService,
    private readonly auditRepo: PrismaAuditLogRepository
  ) {}

  async execute() {
    const rows = await this.userRepo.listInactiveUsersWithOpenAttempts(30);
    const byUser = new Map<string, string[]>();
    for (const r of rows) {
      byUser.set(r.userId, (byUser.get(r.userId) ?? []).concat(r.attemptId));
    }
    let enqueued = 0;
    for (const [userId, attempts] of byUser.entries()) {
      const pref = await this.prefRepo.findByUserId(userId);
      if (!pref || !pref.emailEnabled) continue;
      await this.queueService.enqueueEmail({ to: userId, subject: 'Reminder: unfinished tests', body: `You have ${attempts.length} unfinished attempts.`, meta: { type: 'INACTIVE_REMINDER' } });
      enqueued++;
    }

    await this.auditRepo.create({
      action: 'EMAIL_SENT',
      entityType: 'Reminder',
      entityId: 'monthly_inactive',
      actorId: null,
      metadata: { count: enqueued },
    } as any);
    return { enqueued };
  }
}

