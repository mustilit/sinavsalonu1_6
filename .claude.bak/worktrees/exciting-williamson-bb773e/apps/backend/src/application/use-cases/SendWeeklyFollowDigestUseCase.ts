import { IFollowRepository } from '../../domain/interfaces/IFollowRepository';
import { INotificationPreferenceRepository } from '../../domain/interfaces/INotificationPreferenceRepository';
import { prisma } from '../../infrastructure/database/prisma';
import { PrismaAuditLogRepository } from '../../infrastructure/repositories/PrismaAuditLogRepository';
import { QueueService } from '../../infrastructure/queue/queue.service';

export class SendWeeklyFollowDigestUseCase {
  constructor(
    private readonly followRepo: IFollowRepository,
    private readonly prefRepo: INotificationPreferenceRepository,
    private readonly queueService: QueueService,
    private readonly auditRepo: PrismaAuditLogRepository
  ) {}

  async execute() {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const tests = await prisma.examTest.findMany({ where: { publishedAt: { gte: since } }, select: { id: true, title: true, educatorId: true, examTypeId: true } });
    if (!tests.length) return { enqueued: 0 };

    const byEducator = new Map<string, any[]>();
    const byExamType = new Map<string, any[]>();
    for (const t of tests) {
      if (t.educatorId) {
        byEducator.set(t.educatorId, (byEducator.get(t.educatorId) ?? []).concat(t));
      }
      if (t.examTypeId) {
        byExamType.set(t.examTypeId, (byExamType.get(t.examTypeId) ?? []).concat(t));
      }
    }

    const recipients = new Set<string>();
    for (const [educatorId] of byEducator.entries()) {
      const followers = await this.followRepo.listFollowersForEducator(educatorId);
      for (const u of followers) recipients.add(u);
    }
    for (const [examTypeId] of byExamType.entries()) {
      const followers = await this.followRepo.listFollowersForExamType(examTypeId);
      for (const u of followers) recipients.add(u);
    }

    let enqueued = 0;
    for (const userId of recipients) {
      const pref = await this.prefRepo.findByUserId(userId);
      if (!pref || !pref.emailEnabled) continue;
      await this.queueService.enqueueEmail({ to: userId, subject: 'Weekly digest', body: `New tests published: ${tests.length}`, meta: { type: 'WEEKLY_DIGEST' } });
      enqueued++;
    }

    await this.auditRepo.create({
      action: 'EMAIL_SENT',
      entityType: 'Digest',
      entityId: 'weekly_follow',
      actorId: null,
      metadata: { count: enqueued },
    } as any);

    return { enqueued };
  }
}

