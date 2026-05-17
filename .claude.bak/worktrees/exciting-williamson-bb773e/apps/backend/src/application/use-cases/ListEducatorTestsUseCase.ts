import { IExamRepository } from '../../domain/interfaces/IExamRepository';
import { AppError } from '../errors/AppError';

export class ListEducatorTestsUseCase {
  constructor(private readonly examRepository: IExamRepository) {}

  async execute(educatorId: string) {
    if (!educatorId) throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
    return this.examRepository.findByEducatorId(educatorId);
  }
}
