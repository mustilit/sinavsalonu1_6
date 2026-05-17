import { BadRequestException } from '@nestjs/common';
import type { PrismaClient, AuditAction } from '@prisma/client';

export class SubmitAnswerUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(attemptId: string, questionId: string, selectedOptionId?: string | null, actorId?: string) {
    if (!attemptId || !questionId) throw new BadRequestException({ code: 'INVALID_INPUT', message: 'Missing fields' });

    // load attempt
    const attempt = await this.prisma.testAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new BadRequestException({ code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' });

    if (actorId && attempt.candidateId !== actorId) {
      throw new BadRequestException({ code: 'NOT_ATTEMPT_OWNER', message: 'Actor not owner of attempt' });
    }

    const now = new Date();
    const lastResumedAt = (attempt as any).lastResumedAt ?? attempt.startedAt;
    let remainingSec = (attempt as any).remainingSec ?? 0;
    if ((attempt as any).status === 'IN_PROGRESS') {
      const elapsedSec = Math.max(0, Math.floor((now.getTime() - lastResumedAt.getTime()) / 1000));
      remainingSec = Math.max(0, remainingSec - elapsedSec);
    }

    if (remainingSec <= 0 || (attempt as any).status === 'EXPIRED') {
      // auto-expire attempt
      await this.prisma.testAttempt.update({
        where: { id: attemptId },
        data: {
          status: 'EXPIRED',
          remainingSec: 0,
          finishedAt: now,
        } as any,
      });
      throw new BadRequestException({ code: 'ATTEMPT_EXPIRED', message: 'Attempt has expired' });
    }

    if ((attempt as any).status !== 'IN_PROGRESS') {
      throw new BadRequestException({ code: 'ATTEMPT_NOT_IN_PROGRESS', message: 'Attempt is not in progress' });
    }

    // validate question belongs to test
    const question = await this.prisma.examQuestion.findUnique({ where: { id: questionId } });
    if (!question || (question as any).testId !== attempt.testId) {
      throw new BadRequestException({ code: 'QUESTION_NOT_IN_TEST', message: 'Question does not belong to this test' });
    }

    // if selectedOptionId is not provided => treat as "leave blank" -> delete existing answer if any
    if (!selectedOptionId) {
      try {
        const [deleted] = await this.prisma.$transaction([
          this.prisma.attemptAnswer.deleteMany({ where: { attemptId, questionId } }),
          this.prisma.auditLog.create({
            data: {
              action: 'SUBMIT_ANSWER' as AuditAction,
              entityType: 'AttemptAnswer',
              entityId: attemptId,
              actorId: actorId ?? null,
              metadata: { questionId, action: 'DELETE_ANSWER' },
            },
          }),
        ]);
        return deleted;
      } catch (e) {
        throw new BadRequestException({ code: 'DELETE_FAILED', message: 'Failed to delete answer' });
      }
    }

    // validate option belongs to question
    const option = await this.prisma.examOption.findUnique({ where: { id: selectedOptionId } });
    if (!option || (option as any).questionId !== questionId) {
      throw new BadRequestException({ code: 'OPTION_NOT_IN_QUESTION', message: 'Option does not belong to question' });
    }
    const isCorrect = !!option?.isCorrect;

    try {
      const [result] = await this.prisma.$transaction([
        this.prisma.attemptAnswer.upsert({
          where: { attemptId_questionId: { attemptId, questionId } } as any,
          update: { selectedOptionId, isCorrect },
          create: { attemptId, questionId, selectedOptionId, isCorrect },
        }),
        // create audit log (best-effort)
        this.prisma.auditLog.create({
          data: {
            action: 'SUBMIT_ANSWER' as AuditAction,
            entityType: 'AttemptAnswer',
            entityId: attemptId,
            actorId: actorId ?? null,
            metadata: { questionId },
          },
        }),
      ]);
      return result;
    } catch (e) {
      throw new BadRequestException({ code: 'UPsert_FAILED', message: 'Failed to submit answer' });
    }
  }
}

