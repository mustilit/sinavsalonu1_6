import { IExamRepository } from '../../domain/interfaces/IExamRepository';

export class GetTestUseCase {
  constructor(private readonly examRepository: IExamRepository) {}

  async execute(id: string) {
    return this.examRepository.findById(id);
  }
}

