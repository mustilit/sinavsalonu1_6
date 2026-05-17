import { Injectable, Inject } from '@nestjs/common';
import { ITopicRepository } from '../../domain/interfaces/ITopicRepository';
import { TOPIC_REPO } from '../constants';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class ListTopicsByExamTypeUseCase {
  constructor(@Inject(TOPIC_REPO) private readonly repo: ITopicRepository) {}

  async execute(examTypeId: string, activeOnly = true) {
    if (!examTypeId || !UUID_REGEX.test(examTypeId)) {
      const err: any = new Error('Invalid examTypeId');
      err.status = 400;
      err.code = 'INVALID_UUID';
      throw err;
    }
    return this.repo.listByExamType(examTypeId, activeOnly);
  }
}
