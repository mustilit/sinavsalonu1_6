import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';

export class ResumeTestAttemptUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(attemptId: string, userId: string) {
    if (!attemptId || !userId) {
      throw new BadRequestException({ code: 'INVALID_INPUT', message: 'Missing attemptId or userId' });
    }

    const attempt = await this.prisma.testAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new NotFoundException({ code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' });

    if (attempt.candidateId !== userId) {
      throw new ForbiddenException({ code: 'NOT_OWNER', message: 'Attempt does not belong to user' });
    }

    if ((attempt as any).status === 'EXPIRED') {
      throw new BadRequestException({ code: 'ALREADY_EXPIRED', message: 'Attempt already expired' });
    }

    if ((attempt as any).status !== 'PAUSED') {
      throw new BadRequestException({ code: 'NOT_PAUSED', message: 'Attempt is not paused' });
    }

    const now = new Date();
    const updated = await this.prisma.testAttempt.update({
      where: { id: attemptId },
      data: {
        lastResumedAt: now,
        status: 'IN_PROGRESS',
      } as any,
    });

    return {
      status: updated.status,
      remainingSec: (updated as any).remainingSec,
    };
  }
}

