import { IExamRepository } from '../../domain/interfaces/IExamRepository';
import { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { IAttemptRepository } from '../../domain/interfaces/IAttemptRepository';
import { AppError } from '../errors/AppError';
import { ensureEducatorActive } from '../policies/ensureEducatorActive';

/**
 * Soru ve şık güncelleme. Satın alınmış/cevaplanmış testleri etkilemez:
 * - attempt_answers olan sorular güncellenemez
 * - attempt_answers olan şıklar güncellenemez
 */
export class UpdateQuestionUseCase {
  constructor(
    private readonly examRepository: IExamRepository,
    private readonly userRepository: IUserRepository,
    private readonly attemptRepository: IAttemptRepository,
  ) {}

  async execute(
    questionId: string,
    updates: { content?: string; order?: number },
    actorId?: string,
  ) {
    if (actorId) {
      const user = await this.userRepository.findById(actorId);
      if (!user) throw new AppError('USER_NOT_FOUND', 'User not found', 404);
      ensureEducatorActive(user);
    }

    const question = await this.examRepository.findQuestionById(questionId);
    if (!question) throw new AppError('QUESTION_NOT_FOUND', 'Question not found', 404);

    const test = await this.examRepository.findById(question.testId);
    if (!test) throw new AppError('TEST_NOT_FOUND', 'Test not found', 404);

    if (actorId && test.educatorId && test.educatorId !== actorId) {
      throw new AppError('FORBIDDEN_NOT_OWNER', 'Only the educator who owns the test can update it', 403);
    }

    const hasAttemptAnswers = await this.attemptRepository.hasAnswersForQuestion(questionId);
    if (hasAttemptAnswers) {
      throw new AppError(
        'QUESTION_HAS_ATTEMPTS',
        'Cannot update question: it has been answered. Purchased/attempted tests are not affected.',
        409,
      );
    }

    return this.examRepository.updateQuestion(questionId, updates);
  }
}
