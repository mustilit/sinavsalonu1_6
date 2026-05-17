import { SubmitAnswerUseCase } from '../../src/application/use-cases/SubmitAnswerUseCase';
import { makeAttempt } from '../helpers/fakes';

describe('SubmitAnswerUseCase', () => {
  it('creates attempt answer when not existing', async () => {
    const fakePrisma: any = {
      testAttempt: { findUnique: async () => makeAttempt({ id: 'att1', candidateId: 'u1', testId: 't1', status: 'IN_PROGRESS' }) },
      examQuestion: { findUnique: async () => ({ id: 'q1', testId: 't1' }) },
      examOption: { findUnique: async () => ({ id: 'o1', questionId: 'q1', isCorrect: true }) },
      attemptAnswer: {
        upsert: async (opts: any) => ({ id: 'aa1', ...opts.create }),
      },
      auditLog: { create: async () => ({}) },
    };
    const uc = new SubmitAnswerUseCase(fakePrisma);
    const res = await uc.execute('att1', 'q1', 'o1', 'u1');
    expect(res).toBeDefined();
    expect(res.id).toBeDefined();
  });

  it('updates attempt answer when exists', async () => {
    const fakePrisma2: any = {
      testAttempt: { findUnique: async () => makeAttempt({ id: 'att1', candidateId: 'u1', testId: 't1', status: 'IN_PROGRESS' }) },
      examQuestion: { findUnique: async () => ({ id: 'q1', testId: 't1' }) },
      examOption: { findUnique: async () => ({ id: 'o2', questionId: 'q1', isCorrect: false }) },
      attemptAnswer: {
        upsert: async (opts: any) => ({ id: 'aa1', ...opts.update }),
      },
      auditLog: { create: async () => ({}) },
    };
    const uc2 = new SubmitAnswerUseCase(fakePrisma2);
    const res2 = await uc2.execute('att1', 'q1', 'o2', 'u1');
    expect(res2).toBeDefined();
    expect(res2.id).toEqual('aa1');
  });

  it('rejects when option does not belong to question', async () => {
    const fakePrisma3: any = {
      testAttempt: { findUnique: async () => ({ id: 'att1', candidateId: 'u1', testId: 't1', status: 'IN_PROGRESS' }) },
      examQuestion: { findUnique: async () => ({ id: 'q1', testId: 't1' }) },
      examOption: { findUnique: async () => ({ id: 'oX', questionId: 'q-other', isCorrect: false }) },
      attemptAnswer: {
        upsert: async (opts: any) => ({ id: 'aaX', ...opts.create }),
      },
      auditLog: { create: async () => ({}) },
    };
    const uc3 = new SubmitAnswerUseCase(fakePrisma3);
    await expect(uc3.execute('att1', 'q1', 'oX', 'u1')).rejects.toThrow();
  });

  it('deletes existing answer when optionId missing', async () => {
    const fakePrisma4: any = {
      testAttempt: { findUnique: async () => makeAttempt({ id: 'att1', candidateId: 'u1', testId: 't1', status: 'IN_PROGRESS' }) },
      examQuestion: { findUnique: async () => ({ id: 'q1', testId: 't1' }) },
      attemptAnswer: {
        deleteMany: async (where: any) => ({ count: 1 }),
      },
      auditLog: { create: async () => ({}) },
    };
    const uc4 = new SubmitAnswerUseCase(fakePrisma4);
    const res4 = await uc4.execute('att1', 'q1', undefined, 'u1');
    expect(res4).toBeDefined();
    expect(res4.count).toBeGreaterThanOrEqual(0);
  });
});

