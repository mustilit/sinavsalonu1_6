import { IAttemptRepository } from '../../domain/interfaces/IAttemptRepository';
import { IExamRepository } from '../../domain/interfaces/IExamRepository';
import { IAttemptAnswerRepository } from '../../domain/interfaces/IAttemptAnswerRepository';
import { BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';

export class GetAttemptResultUseCase {
  constructor(private readonly attempts: IAttemptRepository, private readonly exams: IExamRepository, private readonly answers: IAttemptAnswerRepository) {}

  async execute(attemptId: string, candidateId: string) {
    if (!attemptId || !candidateId) throw new BadRequestException('INVALID_INPUT');

    const attempt = await this.attempts.findAttemptById(attemptId);
    if (!attempt) throw new BadRequestException({ code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' });
    if (attempt.candidateId !== candidateId) throw new ForbiddenException({ code: 'NOT_ATTEMPT_OWNER', message: 'Not owner' });
    if (!['SUBMITTED', 'TIMEOUT'].includes(attempt.status as any)) throw new ConflictException({ code: 'ATTEMPT_NOT_FINISHED', message: 'Attempt not finished' });

    const test = await this.exams.findById(attempt.testId);
    if (!test) throw new BadRequestException({ code: 'TEST_NOT_FOUND', message: 'Test not found' });

    const questionIds = (test.questions ?? []).map((q: any) => q.id);

    const answerRows = await this.answers.findByAttemptId(attemptId);
    const answersMap: Record<string, string | null> = {};
    for (const a of answerRows) answersMap[a.questionId] = a.selectedOptionId ?? null;

    const correctMap = await this.exams.findCorrectOptionIdsByQuestionIds(questionIds);

    const questions = questionIds.map((qid: string, idx: number) => {
      const selected = answersMap[qid] ?? null;
      const correctOptionIds = correctMap[qid] ?? [];
      const isCorrect = selected === null ? null : correctOptionIds.includes(selected);
      return { id: qid, index: idx + 1, selectedOptionId: selected, correctOptionIds, isCorrect };
    });

    const total = questions.length;
    const correct = questions.filter((q) => q.isCorrect === true).length;
    const wrong = questions.filter((q) => q.isCorrect === false).length;
    const blank = questions.filter((q) => q.isCorrect === null).length;
    const percentage = total > 0 ? Math.round((correct / total) * 10000) / 100 : 0;

    return {
      attempt: { id: attempt.id, testId: attempt.testId, status: attempt.status, score: attempt.score ?? null, submittedAt: attempt.submittedAt ?? null, completedAt: attempt.completedAt ?? null },
      summary: { correct, wrong, blank, total, percentage },
      questions,
    };
  }
}

