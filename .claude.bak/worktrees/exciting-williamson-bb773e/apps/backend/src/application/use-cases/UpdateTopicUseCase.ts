import { Injectable, Inject } from '@nestjs/common';
import { ITopicRepository } from '../../domain/interfaces/ITopicRepository';
import { IAuditLogRepository } from '../../domain/interfaces/IAuditLogRepository';
import { TOPIC_REPO } from '../constants';
import { slugify } from '../utils/slugify';

@Injectable()
export class UpdateTopicUseCase {
  constructor(
    @Inject(TOPIC_REPO) private readonly repo: ITopicRepository,
    private readonly auditRepo: IAuditLogRepository,
  ) {}

  async execute(id: string, input: { name?: string; slug?: string; active?: boolean }, actorId?: string) {
    const existing = await this.repo.findById(id);
    if (!existing) return null;

    const slug = input.slug?.trim() ? slugify(input.slug) : input.name ? slugify(input.name) : undefined;
    if (slug) {
      const bySlug = await this.repo.findByExamTypeAndSlug(existing.examTypeId, slug);
      if (bySlug && bySlug.id !== id) {
        const err: any = new Error('TOPIC_SLUG_EXISTS');
        err.status = 409;
        err.code = 'TOPIC_SLUG_EXISTS';
        throw err;
      }
    }

    const updated = await this.repo.update(id, { name: input.name, slug, active: input.active });
    if (updated && this.auditRepo) {
      try {
        await this.auditRepo.create({ action: 'TOPIC_UPDATED', entityType: 'Topic', entityId: id, actorId: actorId ?? null, metadata: {} });
      } catch {
        /* swallow */
      }
    }
    return updated;
  }
}
