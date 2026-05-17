import { IFollowRepository } from '../../domain/interfaces/IFollowRepository';
import { IAuditLogRepository } from '../../domain/interfaces/IAuditLogRepository';

export class FollowUseCase {
  constructor(private readonly followRepo: IFollowRepository, private readonly auditRepo: IAuditLogRepository) {}

  async execute(input: { followerId: string; followType: 'EDUCATOR' | 'EXAM_TYPE'; educatorId?: string; examTypeId?: string; notificationsEnabled?: boolean }) {
    // validate
    if (!input.followerId || !input.followType) throw new Error('INVALID_INPUT');
    if (input.followType === 'EDUCATOR' && !input.educatorId) throw new Error('INVALID_INPUT');
    if (input.followType === 'EXAM_TYPE' && !input.examTypeId) throw new Error('INVALID_INPUT');
    await this.followRepo.upsertFollow({ followerId: input.followerId, followType: input.followType, educatorId: input.educatorId ?? null, examTypeId: input.examTypeId ?? null, notificationsEnabled: input.notificationsEnabled });
    try {
      await this.auditRepo.create({ action: 'FOLLOW_CREATED' as any, entityType: 'Follow', entityId: `${input.followerId}:${input.followType}:${input.educatorId ?? input.examTypeId}`, actorId: input.followerId, metadata: { notificationsEnabled: input.notificationsEnabled } } as any);
    } catch {}
  }
}

