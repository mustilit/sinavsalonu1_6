import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { prismaRetry } from '../../infrastructure/prisma/prisma-retry';

export class StartTestAttemptUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(testId: string, userId: string, tenantId?: string | null) {
    if (!testId || !userId) {
      throw new BadRequestException({ code: 'INVALID_INPUT', message: 'Missing testId or userId' });
    }

    const test = await prismaRetry(() => this.prisma.examTest.findUnique({ where: { id: testId } }));
    if (!test) {
      throw new NotFoundException({ code: 'TEST_NOT_FOUND', message: 'Test not found' });
    }

    if (tenantId && (test as any).tenantId && (test as any).tenantId !== tenantId) {
      throw new ForbiddenException({ code: 'TENANT_MISMATCH', message: 'Test does not belong to tenant' });
    }

    // Basit B2C kontrolü: aktif purchase var mı?
    const hasPurchase = await prismaRetry(() =>
      this.prisma.purchase.findFirst({
        where: {
          testId,
          candidateId: userId,
          status: 'ACTIVE',
        } as any,
      }),
    );

    if (!hasPurchase) {
      throw new ForbiddenException({ code: 'NO_PURCHASE', message: 'User has no purchase for this test' });
    }

    const existing = await prismaRetry(() =>
      this.prisma.testAttempt.findFirst({
        where: { testId, candidateId: userId },
      }),
    );

    const durationSec =
      (test as any).durationSec ??
      ((test as any).duration ? Number((test as any).duration) * 60 : null);

    if (!durationSec || durationSec <= 0) {
      throw new BadRequestException({
        code: 'INVALID_DURATION',
        message: 'Test duration is not configured',
      });
    }

    const now = new Date();

    if (!existing) {
      const created = await this.prisma.testAttempt.create({
        data: {
          testId,
          candidateId: userId,
          status: 'IN_PROGRESS',
          startedAt: now,
          lastResumedAt: now,
          remainingSec: durationSec,
        } as any,
      });

      return {
        attemptId: created.id,
        remainingSec: (created as any).remainingSec ?? durationSec,
      };
    }

    if ((existing as any).status === 'PAUSED') {
      const updated = await this.prisma.testAttempt.update({
        where: { id: existing.id },
        data: {
          status: 'IN_PROGRESS',
          lastResumedAt: now,
        } as any,
      });

      return {
        attemptId: updated.id,
        remainingSec: (updated as any).remainingSec ?? durationSec,
      };
    }

    // Eğer zaten IN_PROGRESS ise kalan süreyi döndür
    if ((existing as any).status === 'IN_PROGRESS') {
      return {
        attemptId: existing.id,
        remainingSec: (existing as any).remainingSec ?? durationSec,
      };
    }

    throw new BadRequestException({
      code: 'ATTEMPT_ALREADY_FINISHED',
      message: 'Attempt already finished or expired',
    });
  }
}

