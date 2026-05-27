/**
 * NavigateLiveQuestionUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - Oturum bulunamazsa → SESSION_NOT_FOUND
 * - Başka educator → FORBIDDEN
 * - DRAFT oturum → SESSION_NOT_NAVIGABLE
 * - next yönü → idx+1, max = totalQuestions-1
 * - prev yönü → idx-1, min = 0
 * - ACTIVE oturumda yeni soruya geçince showStats=false set edilir
 * - ENDED oturumda showStats değişmez
 */

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    liveSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { NavigateLiveQuestionUseCase } from '../../../src/application/use-cases/live/NavigateLiveQuestionUseCase';
import { prisma } from '../../../src/infrastructure/database/prisma';
import { AppError } from '../../../src/application/errors/AppError';

const mockPrisma = prisma as any;

function makeSession(overrides: Record<string, any> = {}) {
  return {
    id: 'sess-1',
    educatorId: 'edu-1',
    status: 'ACTIVE',
    currentQuestionIdx: 1,
    showStats: true,
    _count: { questions: 3 },
    ...overrides,
  };
}

describe('NavigateLiveQuestionUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.liveSession.findUnique.mockResolvedValue(makeSession());
    mockPrisma.liveSession.update.mockResolvedValue({});
  });

  it('oturum bulunamazsa SESSION_NOT_FOUND fırlatır', async () => {
    mockPrisma.liveSession.findUnique.mockResolvedValue(null);
    const uc = new NavigateLiveQuestionUseCase();
    await expect(uc.execute('sess-missing', 'edu-1', 'next')).rejects.toMatchObject({
      code: 'SESSION_NOT_FOUND',
    });
  });

  it('başka educator navigate etmeye çalışırsa FORBIDDEN fırlatır', async () => {
    const uc = new NavigateLiveQuestionUseCase();
    await expect(uc.execute('sess-1', 'edu-other', 'next')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('DRAFT oturum → SESSION_NOT_NAVIGABLE fırlatır', async () => {
    mockPrisma.liveSession.findUnique.mockResolvedValue(makeSession({ status: 'DRAFT' }));
    const uc = new NavigateLiveQuestionUseCase();
    await expect(uc.execute('sess-1', 'edu-1', 'next')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('next yönü idx artırır', async () => {
    mockPrisma.liveSession.findUnique.mockResolvedValue(makeSession({ currentQuestionIdx: 0 }));
    const uc = new NavigateLiveQuestionUseCase();
    await uc.execute('sess-1', 'edu-1', 'next');
    expect(mockPrisma.liveSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ currentQuestionIdx: 1 }) }),
    );
  });

  it('prev yönü idx azaltır', async () => {
    mockPrisma.liveSession.findUnique.mockResolvedValue(makeSession({ currentQuestionIdx: 2 }));
    const uc = new NavigateLiveQuestionUseCase();
    await uc.execute('sess-1', 'edu-1', 'prev');
    expect(mockPrisma.liveSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ currentQuestionIdx: 1 }) }),
    );
  });

  it('son soruda next → idx sabit kalır (max bound)', async () => {
    // currentQuestionIdx = 2, total = 3 → max idx = 2
    mockPrisma.liveSession.findUnique.mockResolvedValue(makeSession({ currentQuestionIdx: 2 }));
    const uc = new NavigateLiveQuestionUseCase();
    await uc.execute('sess-1', 'edu-1', 'next');
    expect(mockPrisma.liveSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ currentQuestionIdx: 2 }) }),
    );
  });

  it('ilk soruda prev → idx 0 kalır (min bound)', async () => {
    mockPrisma.liveSession.findUnique.mockResolvedValue(makeSession({ currentQuestionIdx: 0 }));
    const uc = new NavigateLiveQuestionUseCase();
    await uc.execute('sess-1', 'edu-1', 'prev');
    expect(mockPrisma.liveSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ currentQuestionIdx: 0 }) }),
    );
  });

  it('ACTIVE oturumda next → showStats=false set edilir', async () => {
    const uc = new NavigateLiveQuestionUseCase();
    await uc.execute('sess-1', 'edu-1', 'next');
    expect(mockPrisma.liveSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ showStats: false }) }),
    );
  });

  it('ENDED oturumda navigate → showStats set edilmez', async () => {
    mockPrisma.liveSession.findUnique.mockResolvedValue(makeSession({ status: 'ENDED' }));
    const uc = new NavigateLiveQuestionUseCase();
    await uc.execute('sess-1', 'edu-1', 'next');

    const updateCall = mockPrisma.liveSession.update.mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty('showStats');
  });
});
