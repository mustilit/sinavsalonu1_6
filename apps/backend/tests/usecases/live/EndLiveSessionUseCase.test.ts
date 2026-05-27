/**
 * EndLiveSessionUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - Oturum bulunamazsa → SESSION_NOT_FOUND
 * - Başka educator → FORBIDDEN
 * - Başarı: status ENDED, showStats=true
 * - Round 1 bitince Round 2 DRAFT otomatik oluşturulur
 * - Round 2 zaten varsa tekrar oluşturulmaz (idempotent)
 * - Round 2 bitince Round 3 oluşturulmaz
 */

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    liveSession: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import { ForbiddenException } from '@nestjs/common';
import { EndLiveSessionUseCase } from '../../../src/application/use-cases/live/EndLiveSessionUseCase';
import { prisma } from '../../../src/infrastructure/database/prisma';
import { AppError } from '../../../src/application/errors/AppError';

const mockPrisma = prisma as any;

function makeSession(overrides: Record<string, any> = {}) {
  return {
    id: 'sess-1',
    educatorId: 'edu-1',
    title: 'KPSS Canlı',
    status: 'ACTIVE',
    tierId: 'tier-1',
    maxParticipants: 50,
    roundNumber: 1,
    parentSessionId: null,
    paidAt: new Date(),
    questions: [],
    ...overrides,
  };
}

describe('EndLiveSessionUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.liveSession.findUnique.mockResolvedValue(makeSession());
    mockPrisma.liveSession.update.mockResolvedValue(makeSession({ status: 'ENDED', showStats: true }));
    mockPrisma.liveSession.findFirst.mockResolvedValue(null);
    mockPrisma.liveSession.create.mockResolvedValue({ id: 'sess-round2' });
  });

  it('oturum bulunamazsa SESSION_NOT_FOUND fırlatır', async () => {
    mockPrisma.liveSession.findUnique.mockResolvedValue(null);
    const uc = new EndLiveSessionUseCase();
    await expect(uc.execute('sess-missing', 'edu-1')).rejects.toMatchObject({
      code: 'SESSION_NOT_FOUND',
    });
  });

  it('başka educator bitirmeye çalışırsa FORBIDDEN fırlatır', async () => {
    const uc = new EndLiveSessionUseCase();
    await expect(uc.execute('sess-1', 'edu-other')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('başarı: status ENDED, showStats=true set edilir', async () => {
    const uc = new EndLiveSessionUseCase();
    await uc.execute('sess-1', 'edu-1');
    expect(mockPrisma.liveSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ENDED', showStats: true }),
      }),
    );
  });

  it('Round 1 bitince Round 2 DRAFT otomatik oluşturulur', async () => {
    const uc = new EndLiveSessionUseCase();
    await uc.execute('sess-1', 'edu-1');
    expect(mockPrisma.liveSession.create).toHaveBeenCalledTimes(1);
    const createArgs = mockPrisma.liveSession.create.mock.calls[0][0];
    expect(createArgs.data.roundNumber).toBe(2);
    expect(createArgs.data.status).toBe('DRAFT');
    expect(createArgs.data.parentSessionId).toBe('sess-1');
  });

  it('Round 2 zaten varsa tekrar oluşturulmaz (idempotent)', async () => {
    mockPrisma.liveSession.findFirst.mockResolvedValue({ id: 'existing-round2', roundNumber: 2 });
    const uc = new EndLiveSessionUseCase();
    await uc.execute('sess-1', 'edu-1');
    expect(mockPrisma.liveSession.create).not.toHaveBeenCalled();
  });

  it('Round 2 bitince Round 3 oluşturulmaz', async () => {
    mockPrisma.liveSession.findUnique.mockResolvedValue(makeSession({ roundNumber: 2 }));
    const uc = new EndLiveSessionUseCase();
    await uc.execute('sess-1', 'edu-1');
    expect(mockPrisma.liveSession.create).not.toHaveBeenCalled();
  });

  it('Round 2 title tur 2 ekiyle oluşturulur', async () => {
    const uc = new EndLiveSessionUseCase();
    await uc.execute('sess-1', 'edu-1');
    const createArgs = mockPrisma.liveSession.create.mock.calls[0][0];
    expect(createArgs.data.title).toBe('KPSS Canlı - Tur 2');
  });
});
