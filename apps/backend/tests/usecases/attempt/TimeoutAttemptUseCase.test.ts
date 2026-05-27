/**
 * TimeoutAttemptUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - attemptId/candidateId eksik → BadRequestException
 * - Attempt bulunamazsa → ATTEMPT_NOT_FOUND
 * - Owner değilse → NOT_ATTEMPT_OWNER
 * - Zaten TIMEOUT/SUBMITTED → idempotent döner
 * - Test bulunamazsa → TEST_NOT_FOUND
 * - Test zamanlı değilse → TEST_NOT_TIMED
 * - Başarı: skor hesaplanır, markTimeout çağrılır, audit log atılır
 */

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TimeoutAttemptUseCase } from '../../../src/application/use-cases/attempt/TimeoutAttemptUseCase';
import { makeAttempt } from '../../helpers/fakes';

function makeAttemptRepo(attempt: any) {
  return {
    findAttemptById: jest.fn().mockResolvedValue(attempt),
    markTimeout: jest.fn().mockResolvedValue({ ...attempt, status: 'TIMEOUT', score: 2 }),
  };
}

function makeExamRepo(test: any) {
  return { findById: jest.fn().mockResolvedValue(test) };
}

function makeAnswerRepo(rows: any[] = []) {
  return {
    findByAttemptIdWithOptionCorrectness: jest.fn().mockResolvedValue(rows),
  };
}

function makeAuditRepo() {
  return { create: jest.fn().mockResolvedValue({}) };
}

const TIMED_TEST = {
  id: 't1',
  isTimed: true,
  duration: 60,
  questionCount: 3,
};

describe('TimeoutAttemptUseCase', () => {
  it('attemptId eksik ise BadRequestException fırlatır', async () => {
    const uc = new TimeoutAttemptUseCase(
      makeAttemptRepo(null) as any,
      makeExamRepo(null) as any,
      makeAnswerRepo() as any,
    );
    await expect(uc.execute('', 'u1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('candidateId eksik ise BadRequestException fırlatır', async () => {
    const uc = new TimeoutAttemptUseCase(
      makeAttemptRepo(null) as any,
      makeExamRepo(null) as any,
      makeAnswerRepo() as any,
    );
    await expect(uc.execute('att-1', '')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('attempt bulunamazsa ATTEMPT_NOT_FOUND fırlatır', async () => {
    const uc = new TimeoutAttemptUseCase(
      makeAttemptRepo(null) as any,
      makeExamRepo(TIMED_TEST) as any,
      makeAnswerRepo() as any,
    );
    await expect(uc.execute('att-missing', 'u1')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'ATTEMPT_NOT_FOUND' }),
    });
  });

  it('başka kullanıcı timeout tetiklemeye çalışırsa NOT_ATTEMPT_OWNER', async () => {
    const attempt = makeAttempt({ id: 'att-1', candidateId: 'u-owner', status: 'IN_PROGRESS' });
    const uc = new TimeoutAttemptUseCase(
      makeAttemptRepo(attempt) as any,
      makeExamRepo(TIMED_TEST) as any,
      makeAnswerRepo() as any,
    );
    await expect(uc.execute('att-1', 'u-other')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('zaten TIMEOUT durumunda → idempotent döner, markTimeout çağrılmaz', async () => {
    const attempt = makeAttempt({ id: 'att-1', candidateId: 'u1', status: 'TIMEOUT' });
    const attemptRepo = makeAttemptRepo(attempt);
    const uc = new TimeoutAttemptUseCase(
      attemptRepo as any,
      makeExamRepo(TIMED_TEST) as any,
      makeAnswerRepo() as any,
    );
    const result = await uc.execute('att-1', 'u1');
    expect(attemptRepo.markTimeout).not.toHaveBeenCalled();
    expect(result).toBe(attempt);
  });

  it('zaten SUBMITTED durumunda → idempotent döner', async () => {
    const attempt = makeAttempt({ id: 'att-1', candidateId: 'u1', status: 'SUBMITTED' });
    const attemptRepo = makeAttemptRepo(attempt);
    const uc = new TimeoutAttemptUseCase(
      attemptRepo as any,
      makeExamRepo(TIMED_TEST) as any,
      makeAnswerRepo() as any,
    );
    const result = await uc.execute('att-1', 'u1');
    expect(attemptRepo.markTimeout).not.toHaveBeenCalled();
  });

  it('test bulunamazsa TEST_NOT_FOUND fırlatır', async () => {
    const attempt = makeAttempt({ id: 'att-1', candidateId: 'u1', status: 'IN_PROGRESS' });
    const uc = new TimeoutAttemptUseCase(
      makeAttemptRepo(attempt) as any,
      makeExamRepo(null) as any,
      makeAnswerRepo() as any,
    );
    await expect(uc.execute('att-1', 'u1')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'TEST_NOT_FOUND' }),
    });
  });

  it('zamanlı olmayan test → TEST_NOT_TIMED fırlatır', async () => {
    const attempt = makeAttempt({ id: 'att-1', candidateId: 'u1', status: 'IN_PROGRESS' });
    const uc = new TimeoutAttemptUseCase(
      makeAttemptRepo(attempt) as any,
      makeExamRepo({ ...TIMED_TEST, isTimed: false }) as any,
      makeAnswerRepo() as any,
    );
    await expect(uc.execute('att-1', 'u1')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'TEST_NOT_TIMED' }),
    });
  });

  it('başarı: skor hesaplanır, markTimeout çağrılır, audit log atılır', async () => {
    const attempt = makeAttempt({ id: 'att-1', candidateId: 'u1', status: 'IN_PROGRESS' });
    const attemptRepo = makeAttemptRepo(attempt);
    const auditRepo = makeAuditRepo();
    const answers = [
      { selectedOptionId: 'o1', isCorrect: true },
      { selectedOptionId: 'o2', isCorrect: false },
      { selectedOptionId: null, isCorrect: null }, // blank
    ];
    const uc = new TimeoutAttemptUseCase(
      attemptRepo as any,
      makeExamRepo(TIMED_TEST) as any,
      makeAnswerRepo(answers) as any,
      auditRepo as any,
    );

    const result = await uc.execute('att-1', 'u1');

    expect(attemptRepo.markTimeout).toHaveBeenCalledTimes(1);
    expect(result.correct).toBe(1);
    expect(result.wrong).toBe(1);
    expect(result.blank).toBe(1);
    expect(result.score).toBe(1);
    expect(auditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SUBMIT_ATTEMPT', metadata: expect.objectContaining({ reason: 'TIMEOUT' }) }),
    );
  });

  it('audit log hatası main flow u kesmez', async () => {
    const attempt = makeAttempt({ id: 'att-1', candidateId: 'u1', status: 'IN_PROGRESS' });
    const auditRepo = { create: jest.fn().mockRejectedValue(new Error('AUDIT_FAIL')) };
    const uc = new TimeoutAttemptUseCase(
      makeAttemptRepo(attempt) as any,
      makeExamRepo(TIMED_TEST) as any,
      makeAnswerRepo([]) as any,
      auditRepo as any,
    );
    const result = await uc.execute('att-1', 'u1');
    expect(result.score).toBe(0);
  });
});
