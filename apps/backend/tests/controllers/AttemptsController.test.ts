/**
 * AttemptsController unit testleri.
 * Controller PrismaService ile use-case'leri manuel oluşturduğundan
 * tüm use-case'ler ve prisma mock'lanır.
 */

jest.mock('../../src/infrastructure/database/prisma', () => ({
  prisma: {},
}));

jest.mock('../../src/infrastructure/repositories/PrismaAttemptRepository', () => ({
  PrismaAttemptRepository: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../src/infrastructure/repositories/PrismaExamRepository', () => ({
  PrismaExamRepository: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../src/infrastructure/repositories/PrismaAttemptAnswerRepository', () => ({
  PrismaAttemptAnswerRepository: jest.fn().mockImplementation(() => ({})),
}));

const mockStart = jest.fn().mockResolvedValue({ id: 'att-1', status: 'IN_PROGRESS' });
const mockPause = jest.fn().mockResolvedValue({ id: 'att-1', status: 'PAUSED' });
const mockResume = jest.fn().mockResolvedValue({ id: 'att-1', status: 'IN_PROGRESS' });
const mockGet = jest.fn().mockResolvedValue({ id: 'att-1' });
const mockSubmitAnswer = jest.fn().mockResolvedValue({ saved: true });
const mockSubmitAttempt = jest.fn().mockResolvedValue({ score: 0.8 });
const mockAnomaly = jest.fn().mockResolvedValue({ logged: true });
const mockGetState = jest.fn().mockResolvedValue({ attemptId: 'att-1', remaining: 1200 });
const mockGetResult = jest.fn().mockResolvedValue({ score: 0.8, correct: 8, total: 10 });
const mockTimeout = jest.fn().mockResolvedValue({ status: 'EXPIRED' });
const mockGetSolution = jest.fn().mockResolvedValue({ solutionText: 'Doğru cevap B' });

jest.mock('../../src/application/use-cases/attempt/StartTestAttemptUseCase', () => ({
  StartTestAttemptUseCase: jest.fn().mockImplementation(() => ({ execute: mockStart })),
}));
jest.mock('../../src/application/use-cases/attempt/PauseTestAttemptUseCase', () => ({
  PauseTestAttemptUseCase: jest.fn().mockImplementation(() => ({ execute: mockPause })),
}));
jest.mock('../../src/application/use-cases/attempt/ResumeTestAttemptUseCase', () => ({
  ResumeTestAttemptUseCase: jest.fn().mockImplementation(() => ({ execute: mockResume })),
}));
jest.mock('../../src/application/use-cases/attempt/GetTestAttemptUseCase', () => ({
  GetTestAttemptUseCase: jest.fn().mockImplementation(() => ({ execute: mockGet })),
}));
jest.mock('../../src/application/use-cases/attempt/SubmitAnswerUseCase', () => ({
  SubmitAnswerUseCase: jest.fn().mockImplementation(() => ({ execute: mockSubmitAnswer })),
}));
jest.mock('../../src/application/use-cases/attempt/GetAttemptStateUseCase', () => ({
  GetAttemptStateUseCase: jest.fn().mockImplementation(() => ({ execute: mockGetState })),
}));
jest.mock('../../src/application/use-cases/attempt/GetAttemptResultUseCase', () => ({
  GetAttemptResultUseCase: jest.fn().mockImplementation(() => ({ execute: mockGetResult })),
}));
jest.mock('../../src/application/use-cases/attempt/SubmitAttemptUseCase', () => ({
  SubmitAttemptUseCase: jest.fn().mockImplementation(() => ({ execute: mockSubmitAttempt })),
}));
jest.mock('../../src/application/use-cases/attempt/TimeoutAttemptUseCase', () => ({
  TimeoutAttemptUseCase: jest.fn().mockImplementation(() => ({ execute: mockTimeout })),
}));
jest.mock('../../src/application/use-cases/attempt/LogAttemptAnomalyUseCase', () => ({
  LogAttemptAnomalyUseCase: jest.fn().mockImplementation(() => ({ execute: mockAnomaly })),
}));
jest.mock('../../src/application/use-cases/question/GetQuestionSolutionUseCase', () => ({
  GetQuestionSolutionUseCase: jest.fn().mockImplementation(() => ({ execute: mockGetSolution })),
}));

import { AttemptsController } from '../../src/nest/controllers/attempts.controller';

const mockPrismaService = {
  client: {
    testAttempt: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    examTest: { findUnique: jest.fn() },
  },
};

describe('AttemptsController', () => {
  let controller: AttemptsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AttemptsController(mockPrismaService as any);
  });

  describe('start', () => {
    it('testId ve userId ile deneme başlatır', async () => {
      const req = { user: { id: 'cand-1' }, tenant: { id: 'tenant-1' } };
      const result = await controller.start('test-1', req as any);
      expect(mockStart).toHaveBeenCalledWith('test-1', 'cand-1', 'tenant-1');
      expect(result).toHaveProperty('id', 'att-1');
    });
  });

  describe('pause', () => {
    it('attemptId ve userId ile denemeyi duraklatır', async () => {
      const req = { user: { id: 'cand-1' } };
      const result = await controller.pause('att-1', req as any);
      expect(mockPause).toHaveBeenCalledWith('att-1', 'cand-1');
      expect(result).toHaveProperty('status', 'PAUSED');
    });
  });

  describe('resume', () => {
    it('attemptId ve userId ile devam ettirir', async () => {
      const req = { user: { id: 'cand-1' } };
      const result = await controller.resume('att-1', req as any);
      expect(mockResume).toHaveBeenCalledWith('att-1', 'cand-1');
      expect(result).toHaveProperty('status', 'IN_PROGRESS');
    });
  });

  describe('answer (singular)', () => {
    it('cevabı kaydeder', async () => {
      const body = { questionId: 'q-1', selectedOptionId: 'opt-A' };
      const req = { user: { id: 'cand-1' } };
      await controller.answer('att-1', body, req as any);
      expect(mockSubmitAnswer).toHaveBeenCalledWith('att-1', 'q-1', 'opt-A', 'cand-1');
    });
  });

  describe('answers (plural)', () => {
    it('optionId öncelikli olarak kullanılır', async () => {
      const body = { questionId: 'q-1', optionId: 'opt-B', selectedOptionId: 'opt-A' };
      const req = { user: { id: 'cand-1' } };
      await controller.answers('att-1', body, req as any);
      expect(mockSubmitAnswer).toHaveBeenCalledWith('att-1', 'q-1', 'opt-B', 'cand-1');
    });

    it('optionId yoksa selectedOptionId kullanılır', async () => {
      const body = { questionId: 'q-1', selectedOptionId: 'opt-C' };
      const req = { user: { id: 'cand-1' } };
      await controller.answers('att-1', body, req as any);
      expect(mockSubmitAnswer).toHaveBeenCalledWith('att-1', 'q-1', 'opt-C', 'cand-1');
    });
  });

  describe('state', () => {
    it('deneme durumunu döndürür', async () => {
      const req = { user: { id: 'cand-1' } };
      const result = await controller.state('att-1', req as any);
      expect(mockGetState).toHaveBeenCalledWith('att-1', 'cand-1');
      expect(result).toHaveProperty('remaining', 1200);
    });
  });

  describe('finish', () => {
    it('denemeyi tamamlar ve skoru döndürür', async () => {
      const req = { user: { id: 'cand-1' } };
      const result = await controller.finish('att-1', req as any);
      // Controller submitAttemptUC.execute(attemptId, undefined, userId) olarak çağırır
      expect(mockSubmitAttempt).toHaveBeenCalledWith('att-1', undefined, 'cand-1');
      expect(result).toHaveProperty('score', 0.8);
    });
  });

  describe('timeout', () => {
    it('denemeyi zaman aşımına uğratır', async () => {
      const req = { user: { id: 'cand-1' } };
      const result = await controller.timeout('att-1', req as any);
      expect(mockTimeout).toHaveBeenCalledWith('att-1', 'cand-1');
      expect(result).toHaveProperty('status', 'EXPIRED');
    });
  });

  describe('result', () => {
    it('deneme sonucunu döndürür', async () => {
      const req = { user: { id: 'cand-1' } };
      const result = await controller.result('att-1', req as any);
      expect(mockGetResult).toHaveBeenCalledWith('att-1', 'cand-1');
      expect(result).toHaveProperty('score', 0.8);
    });
  });

  describe('get', () => {
    it('attempt\'i id ile getirir', async () => {
      const req = { user: { id: 'cand-1' } };
      await controller.get('att-1', req as any);
      expect(mockGet).toHaveBeenCalledWith('att-1', 'cand-1');
    });
  });

  describe('anomaly', () => {
    it('anomali olayını kaydeder', async () => {
      const body = { type: 'TAB_SWITCH', payload: { count: 3 } };
      const req = { user: { id: 'cand-1' } };
      const result = await controller.anomaly('att-1', body, req as any);
      expect(mockAnomaly).toHaveBeenCalledWith('att-1', 'cand-1', 'TAB_SWITCH', { count: 3 });
      expect(result).toHaveProperty('logged', true);
    });
  });
});
