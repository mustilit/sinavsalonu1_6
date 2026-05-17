import { GetQuestionSolutionUseCase } from '../../src/application/use-cases/GetQuestionSolutionUseCase';
import { BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { makeAttempt, makeAttemptRepo } from '../helpers/fakes';

describe('GetQuestionSolutionUseCase', () => {
  const fakeAttemptRepo = makeAttemptRepo();

  const fakeExamRepo: any = {
    findById: async (id: string) => {
      if (id === 'test-no-solutions') return { id: 'test-no-solutions', hasSolutions: false, questions: [{ id: 'q1', solutionText: 's1', solutionMediaUrl: null }] };
      if (id === 'test-with-solutions') return { id: 'test-with-solutions', hasSolutions: true, questions: [{ id: 'q1', solutionText: 's1', solutionMediaUrl: 'url' }] };
      return null;
    },
  };

  // no direct prisma mocking needed after repository change
  it('throws when not owner', async () => {
    const uc = new GetQuestionSolutionUseCase(fakeAttemptRepo, fakeExamRepo);
    await expect(uc.execute('att-not-owner', 'q1', 'u1')).rejects.toThrow(ForbiddenException);
  });

  it('throws when attempt not submitted', async () => {
    const uc = new GetQuestionSolutionUseCase(fakeAttemptRepo, fakeExamRepo);
    await expect(uc.execute('att-not-submitted', 'q1', 'u1')).rejects.toThrow(ConflictException);
  });

  it('throws when solutions disabled', async () => {
    const uc = new GetQuestionSolutionUseCase(fakeAttemptRepo, fakeExamRepo);
    await expect(uc.execute('att-test-no-solutions', 'q1', 'u1')).rejects.toThrow(BadRequestException);
  });

  it('returns solution when ok', async () => {
    const uc = new GetQuestionSolutionUseCase(fakeAttemptRepo, fakeExamRepo);
    const res = await uc.execute('att1', 'q1', 'u1');
    expect(res).toHaveProperty('questionId', 'q1');
    expect(res).toHaveProperty('solutionText', 's1');
    expect(res).toHaveProperty('solutionMediaUrl', 'url');
  });

  it('allows TIMEOUT attempts to read solutions', async () => {
    const repo = makeAttemptRepo({ findAttemptById: async () => makeAttempt({ id: 'att-timeout', candidateId: 'u1', testId: 'test-with-solutions', status: 'TIMEOUT' }) });
    const uc = new GetQuestionSolutionUseCase(repo, fakeExamRepo);
    const res = await uc.execute('att-timeout', 'q1', 'u1');
    expect(res).toHaveProperty('questionId', 'q1');
  });
});

