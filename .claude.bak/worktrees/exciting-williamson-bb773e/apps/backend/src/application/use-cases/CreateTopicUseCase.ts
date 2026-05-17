import { Injectable, Inject } from '@nestjs/common';
import { ITopicRepository } from '../../domain/interfaces/ITopicRepository';
import { IExamTypeRepository } from '../../domain/interfaces/IExamTypeRepository';
import { PrismaAuditLogRepository } from '../../infrastructure/repositories/PrismaAuditLogRepository';
import { EXAM_TYPE_REPO } from '../constants';
import { TOPIC_REPO } from '../constants';
import { slugify } from '../utils/slugify';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class CreateTopicUseCase {
  constructor(
    @Inject(TOPIC_REPO) private readonly topicRepo: ITopicRepository,
    @Inject(EXAM_TYPE_REPO) private readonly examTypeRepo: IExamTypeRepository,
    private readonly auditRepo: PrismaAuditLogRepository,
  ) {}

  async execute(
    input: { examTypeId: string; name: string; slug?: string; active?: boolean },
    actorId?: string,
  ) {
    if (!UUID_REGEX.test(input.examTypeId)) {
      const err: any = new Error('Invalid examTypeId');
      err.status = 400;
      err.code = 'INVALID_UUID';
      throw err;
    }
    const examType = await this.examTypeRepo.findById(input.examTypeId);
    if (!examType) {
      const err: any = new Error('ExamType not found');
      err.status = 404;
      err.code = 'EXAMTYPE_NOT_FOUND';
      throw err;
    }
    const slug = input.slug?.trim() ? slugify(input.slug) : slugify(input.name);
    const existing = await this.topicRepo.findByExamTypeAndSlug(input.examTypeId, slug);
    if (existing) {
      const err: any = new Error('TOPIC_SLUG_EXISTS');
      err.status = 409;
      err.code = 'TOPIC_SLUG_EXISTS';
      throw err;
    }
    const created = await this.topicRepo.create({
      examTypeId: input.examTypeId,
      name: input.name,
      slug,
      active: input.active ?? true,
    });
    try {
      await this.auditRepo.create({
        action: 'TOPIC_CREATED',
        entityType: 'TOPIC',
        entityId: created.id,
        actorId: actorId ?? null,
        metadata: {},
      });
    } catch {
      // swallow audit errors
    }
    return created;
  }
}
