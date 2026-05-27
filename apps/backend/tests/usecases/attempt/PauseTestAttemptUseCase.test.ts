/**
 * PauseTestAttemptUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - attemptId/userId eksik → INVALID_INPUT
 * - Attempt bulunamazsa → ATTEMPT_NOT_FOUND
 * - Başka kullanıcı → NOT_OWNER
 * - IN_PROGRESS değilse → NOT_IN_PROGRESS
 * - Kalan süre varsa → PAUSED status
 * - Kalan süre bittiyse → EXPIRED status
 * - remainingSec hesabı doğru
 */

function makePrisma(attempt: any, examTest: any = null) {
  return {
    testAttempt: {
      findUnique: jest.fn().mockResolvedValue(attempt),
      update: jest.fn().mockImplementation(async ({ data }: any) => ({
        ...attempt,
        status: data.status,
        remainingSec: data.remainingSec,
      })),
    },
    examTest: {
      findUnique: jest.fn().mockResolvedValue(examTest),
    },
  };
}

import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PauseTestAttemptUseCase } from '../../../src/application/use-cases/attempt/PauseTestAttemptUseCase';

function makeAttempt(overrides: Record<string, any> = {}) {
  return {
    id: 'att-1',
    testId: 'test-1',
    candidateId: 'u1',
    status: 'IN_PROGRESS',
    startedAt: new Date(Date.now() - 60_000),  // 1 dk önce başladı
    lastResumedAt: new Date(Date.now() - 30_000), // 30s önce resume
    remainingSec: 3600,
    finishedAt: null,
    ...overrides,
  };
}

describe('PauseTestAttemptUseCase', () => {
  it('attemptId eksik → BadRequestException', async () => {
    const prisma = makePrisma(null);
    const uc = new PauseTestAttemptUseCase(prisma as any);
    await expect(uc.execute('', 'u1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('userId eksik → BadRequestException', async () => {
    const prisma = makePrisma(null);
    const uc = new PauseTestAttemptUseCase(prisma as any);
    await expect(uc.execute('att-1', '')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('attempt bulunamazsa ATTEMPT_NOT_FOUND', async () => {
    const prisma = makePrisma(null);
    const uc = new PauseTestAttemptUseCase(prisma as any);
    await expect(uc.execute('att-missing', 'u1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('başka kullanıcı → NOT_OWNER', async () => {
    const prisma = makePrisma(makeAttempt({ candidateId: 'u-owner' }));
    const uc = new PauseTestAttemptUseCase(prisma as any);
    await expect(uc.execute('att-1', 'u-other')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('SUBMITTED status → NOT_IN_PROGRESS', async () => {
    const prisma = makePrisma(makeAttempt({ status: 'SUBMITTED' }));
    const uc = new PauseTestAttemptUseCase(prisma as any);
    await expect(uc.execute('att-1', 'u1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('kalan süre varsa → PAUSED status', async () => {
    const prisma = makePrisma(makeAttempt({ remainingSec: 3600, lastResumedAt: new Date(Date.now() - 10_000) }));
    const uc = new PauseTestAttemptUseCase(prisma as any);
    const result = await uc.execute('att-1', 'u1');
    expect(result.status).toBe('PAUSED');
    expect(result.remainingSec).toBeLessThan(3600); // süre geçti
    expect(result.remainingSec).toBeGreaterThan(0);
  });

  it('kalan süre bittiyse → EXPIRED status', async () => {
    // remainingSec=5, ama 10s geçti → kalan=0
    const prisma = makePrisma(makeAttempt({
      remainingSec: 5,
      lastResumedAt: new Date(Date.now() - 10_000),
    }));
    const uc = new PauseTestAttemptUseCase(prisma as any);
    const result = await uc.execute('att-1', 'u1');
    expect(result.status).toBe('EXPIRED');
    expect(result.remainingSec).toBe(0);
  });

  it('remainingSec null ise examTest.durationSec kullanılır', async () => {
    const prisma = makePrisma(
      makeAttempt({ remainingSec: null, lastResumedAt: new Date(Date.now() - 10_000) }),
      { durationSec: 3600 },
    );
    const uc = new PauseTestAttemptUseCase(prisma as any);
    const result = await uc.execute('att-1', 'u1');
    expect(result.status).toBe('PAUSED');
    expect(result.remainingSec).toBeGreaterThan(0);
  });
});
