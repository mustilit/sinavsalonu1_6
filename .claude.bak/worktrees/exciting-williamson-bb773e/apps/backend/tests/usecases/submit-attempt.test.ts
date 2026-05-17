import { SubmitAttemptUseCase } from '../../src/application/use-cases/SubmitAttemptUseCase';
import { makeAttempt } from '../helpers/fakes';

describe('SubmitAttemptUseCase', () => {
  it('finalizes attempt using stored answers', async () => {
    const fakePrisma: any = {
      testAttempt: { findUnique: async () => makeAttempt({ id: 'att1', candidateId: 'u1', testId: 't1', status: 'IN_PROGRESS' }), update: async (opts: any) => ({ id: 'att1', ...opts.data }) },
      attemptAnswer: { findMany: async () => [{ questionId: 'q1', selectedOptionId: 'o1' }, { questionId: 'q2', selectedOptionId: 'o2' }] },
      examOption: { findMany: async ({ where }: any) => [{ id: 'o1', isCorrect: true }, { id: 'o2', isCorrect: false }] },
      auditLog: { create: async () => ({}) },
    };
    const uc = new SubmitAttemptUseCase(fakePrisma);
    const res = await uc.execute('att1', undefined, 'u1');
    expect(res.score).toBeGreaterThanOrEqual(0);
    expect(res.updated.status).toEqual('SUBMITTED');
    expect(res.correct + res.wrong + res.blank).toEqual(expect.any(Number));
  });

  it('is idempotent when already submitted', async () => {
    const fakePrisma: any = {
      testAttempt: {
        findUnique: async (q: any) => makeAttempt({ id: 'att1', candidateId: 'u1', testId: 't1', status: 'SUBMITTED', score: 1 }),
        update: async () => ({ id: 'att1', status: 'SUBMITTED', score: 1 }),
      },
      attemptAnswer: { findMany: async () => [{ questionId: 'q1', selectedOptionId: 'o1' }] },
      examOption: { findMany: async ({ where }: any) => [{ id: 'o1', isCorrect: true }] },
      auditLog: { create: async () => ({}) },
      examQuestion: { count: async () => 2 },
    };
    const uc = new SubmitAttemptUseCase(fakePrisma);
    const res = await uc.execute('att1', undefined, 'u1');
    expect(res.score).toEqual(1);
    expect(res.correct).toBeDefined();
  });
});

