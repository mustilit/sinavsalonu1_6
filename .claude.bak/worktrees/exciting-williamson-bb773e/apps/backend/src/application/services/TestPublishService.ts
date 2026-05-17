import { ExamWithQuestions } from '../../domain/interfaces/IExamRepository';
import { IExamRepository } from '../../domain/interfaces/IExamRepository';
import { AuditLogService } from './AuditLogService';

/**
 * TestPublishService
 * İş kuralları Controller'da değil Service katmanında uygulanır.
 * Kritik işlemler (Publish/Unpublish) AuditLog ile loglanır.
 */
export class TestPublishService {
  private static readonly MIN_QUESTIONS = 5;
  private static readonly ENTITY_TYPE = 'ExamTest';

  constructor(
    private readonly examRepository: IExamRepository,
    private readonly auditLogService: AuditLogService
  ) {}

  /**
   * Test yayınlama - tüm validasyonlar Service katmanında
   * Kritik işlem: AuditLog ile loglanır
   */
  async publish(testId: string, actorId?: string | null): Promise<ExamWithQuestions> {
    const test = await this.examRepository.findById(testId);
    if (!test) {
      throw new Error('TEST_NOT_FOUND');
    }

    // 1. Min 5 soru kontrolü
    this.validateMinQuestions(test);

    // 2. Her soruda tam 1 doğru şık zorunluluğu
    this.validateOneCorrectOptionPerQuestion(test);

    // 3. Süreli test ise duration null olamaz
    this.validateDurationForTimedTest(test);

    const published = await this.examRepository.publish(testId);
    if (!published) throw new Error('TEST_NOT_FOUND');

    await this.auditLogService.logPublish(TestPublishService.ENTITY_TYPE, testId, actorId);
    return published;
  }

  /**
   * Test yayından kaldırma - kritik işlem: AuditLog ile loglanır
   */
  async unpublish(testId: string, actorId?: string | null): Promise<ExamWithQuestions> {
    const test = await this.examRepository.findById(testId);
    if (!test) throw new Error('TEST_NOT_FOUND');

    const unpublished = await this.examRepository.unpublish(testId);
    if (!unpublished) throw new Error('TEST_NOT_FOUND');

    await this.auditLogService.logUnpublish(TestPublishService.ENTITY_TYPE, testId, actorId);
    return unpublished;
  }

  private validateMinQuestions(test: ExamWithQuestions): void {
    const questionCount = test.questions?.length ?? 0;
    if (questionCount < TestPublishService.MIN_QUESTIONS) {
      throw new Error(
        `MIN_QUESTIONS_VIOLATION: Test yayınlanabilmesi için minimum ${TestPublishService.MIN_QUESTIONS} soru gerekir. Mevcut: ${questionCount}`
      );
    }
  }

  private validateOneCorrectOptionPerQuestion(test: ExamWithQuestions): void {
    for (const question of test.questions) {
      const correctCount = question.options?.filter((o) => o.isCorrect).length ?? 0;
      if (correctCount !== 1) {
        throw new Error(
          `ONE_CORRECT_OPTION_VIOLATION: Her soruda tam 1 doğru şık olmalı. Soru "${question.content.substring(0, 30)}..." - doğru şık sayısı: ${correctCount}`
        );
      }
    }
  }

  private validateDurationForTimedTest(test: ExamWithQuestions): void {
    if (test.isTimed && (test.duration == null || test.duration <= 0)) {
      throw new Error(
        'DURATION_REQUIRED: Süreli test için duration (dakika) zorunludur ve 0\'dan büyük olmalıdır.'
      );
    }
  }
}
