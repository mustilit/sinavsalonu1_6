import { Injectable, Inject } from '@nestjs/common';
import { IExamTypeRepository } from '../../domain/interfaces/IExamTypeRepository';
import { EXAM_TYPE_REPO } from '../constants';

@Injectable()
export class ListExamTypesUseCase {
  constructor(@Inject(EXAM_TYPE_REPO) private readonly repo: IExamTypeRepository) {}

  async execute(activeOnly = true) {
    return this.repo.list({ activeOnly });
  }
}

