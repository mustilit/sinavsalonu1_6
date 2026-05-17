import { Injectable, Inject } from '@nestjs/common';
import { ITopicRepository } from '../../domain/interfaces/ITopicRepository';
import { IAuditLogRepository } from '../../domain/interfaces/IAuditLogRepository';
import { TOPIC_REPO } from '../constants';
import { AppError } from '../errors/AppError';

@Injectable()
export class DeleteTopicUseCase {
  constructor(
    @Inject(TOPIC_REPO) private readonly repo: ITopicRepository,
    private readonly auditRepo: IAuditLogRepository,
  ) {}

  async execute(id: string, actorId?: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new AppError('NOT_FOUND', 'Topic not found', 404);

    const deleted = await this.repo.delete(id);
    if (!deleted) throw new AppError('CONFLICT', 'Cannot delete topic', 409);

    if (this.auditRepo) {
      try {
        await this.auditRepo.create({ action: 'TOPIC_DELETED', entityType: 'Topic', entityId: id, actorId: actorId ?? null, metadata: {} });
      } catch {
        /* swallow */
      }
    }
    return { deleted: true };
  }
}
