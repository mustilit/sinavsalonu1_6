import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';

export class SubmitAttemptUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Finalize attempt: compute correct/wrong/blank without N+1 queries.
   */
  async execute(attemptId: string, answers?: { questionId: string; optionId: string }[], actorId?: string) {
    if (!attemptId) throw new BadRequestException({ code: 'INVALID_INPUT', message: 'Missing attemptId' });

    const attempt = await this.prisma.testAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new BadRequestException({ code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' });

    if (actorId && attempt.candidateId !== actorId) {
      throw new ForbiddenException({ message: 'NOT_ATTEMPT_OWNER' });
    }

    // If already submitted, return current stats (idempotent)
    if ((attempt as any).status === 'SUBMITTED') {
      const existingRows = await this.prisma.attemptAnswer.findMany({
        where: { attemptId },
        select: { questionId: true, selectedOptionId: true },
      });
      const answeredCountEx = existingRows.length;
      const rawOptionIdsEx = existingRows.map((r) => r.selectedOptionId);
      const optionIdsEx = Array.from(
        new Set(
          (rawOptionIdsEx ?? []).filter(
            (v): v is string => typeof v === 'string' && v.length > 0,
          ),
        ),
      );
      const optionsEx = optionIdsEx.length > 0 ? await this.prisma.examOption.findMany({ where: { id: { in: optionIdsEx } }, select: { id: true, isCorrect: true } }) : [];
      const correctSetEx = new Set(optionsEx.filter((o) => o.isCorrect).map((o) => o.id));
      let correctEx = 0;
      for (const r of existingRows) {
        if (r.selectedOptionId && correctSetEx.has(r.selectedOptionId)) correctEx++;
      }
      const totalQuestionsEx = await this.prisma.examQuestion.count({ where: { testId: attempt.testId } });
      const wrongEx = answeredCountEx - correctEx;
      const blankEx = Math.max(0, totalQuestionsEx - answeredCountEx);
      return { correct: correctEx, wrong: wrongEx, blank: blankEx, score: attempt.score ?? correctEx, updated: attempt };
    }

    // gather answer rows
    let answerRows: { questionId: string; selectedOptionId: string }[] = [];
    if (Array.isArray(answers) && answers.length > 0) {
      answerRows = answers.map((a) => ({ questionId: a.questionId, selectedOptionId: a.optionId }));
    } else {
      answerRows = await this.prisma.attemptAnswer.findMany({
        where: { attemptId },
        select: { questionId: true, selectedOptionId: true },
      }) as any;
    }

    const answeredCount = answerRows.length;
    const optionIds = Array.from(
      new Set(
        answerRows
          .map((r) => r.selectedOptionId)
          .filter((x): x is string => x != null),
      ),
    );

    // fetch options in one query
    const options = optionIds.length > 0 ? await this.prisma.examOption.findMany({ where: { id: { in: optionIds } }, select: { id: true, isCorrect: true } }) : [];
    const correctSet = new Set(options.filter((o) => o.isCorrect).map((o) => o.id));

    let correct = 0;
    for (const r of answerRows) {
      if (r.selectedOptionId && correctSet.has(r.selectedOptionId)) correct++;
    }

    // total questions count
    const totalQuestions = await this.prisma.examQuestion.count({ where: { testId: attempt.testId } });
    const wrong = answeredCount - correct;
    const blank = Math.max(0, totalQuestions - answeredCount);
    const score = correct;

    const updated = await this.prisma.testAttempt.update({
      where: { id: attemptId },
      data: { score, status: 'SUBMITTED', submittedAt: new Date(), completedAt: new Date() },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'SUBMIT_ATTEMPT',
          entityType: 'TestAttempt',
          entityId: attemptId,
          actorId: actorId ?? null,
          metadata: { correct, wrong, blank, score },
        },
      });
    } catch {
      // ignore audit failures
    }

    return { correct, wrong, blank, score, updated };
  }
}

