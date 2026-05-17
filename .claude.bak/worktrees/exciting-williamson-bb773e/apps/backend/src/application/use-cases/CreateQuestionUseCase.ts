import { IExamRepository } from '../../domain/interfaces/IExamRepository';
import { randomUUID } from 'crypto';

export class CreateQuestionUseCase {
  constructor(private readonly examRepository: IExamRepository) {}

  async execute(testId: string, input: { content: string; order?: number; options: { content: string; isCorrect: boolean }[] }) {
    const qId = randomUUID();
    const question = {
      id: qId,
      testId,
      content: input.content,
      order: input.order ?? 0,
      options: input.options.map(o => ({ id: randomUUID(), content: o.content, isCorrect: o.isCorrect })),
    };
    return this.examRepository.addQuestion(testId, question as any);
  }
}

