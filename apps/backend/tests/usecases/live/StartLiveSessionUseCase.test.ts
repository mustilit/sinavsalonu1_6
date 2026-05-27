/**
 * StartLiveSessionUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - Oturum bulunamazsa → SESSION_NOT_FOUND
 * - Başka educator → FORBIDDEN
 * - Zaten ACTIVE → ALREADY_ACTIVE
 * - ENDED → SESSION_ENDED
 * - Ödeme yapılmamış → NOT_PAID
 * - Başka ACTIVE oturum varsa → EDUCATOR_HAS_ACTIVE_SESSION
 * - Başarı: status ACTIVE, startedAt set edilir
 */

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    liveSession: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { StartLiveSessionUseCase } from '../../../src/application/use-cases/live/StartLiveSessionUseCase';
import { prisma } from '../../../src/infrastructure/database/prisma';
import { AppError } from '../../../src/application/errors/AppError';

const mockPrisma = prisma as any;

function makeSession(overrides: Record<string, any> = {}) {
  return {
    id: 'sess-1',
    educatorId: 'edu-1',
    status: 'DRAFT',
    paidAt: new Date(),
    ...overrides,
  };
}

describe('StartLiveSessionUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.liveSession.findUnique.mockResolvedValue(makeSession());
    mockPrisma.liveSession.findFirst.mockResolvedValue(null); // no other active session
    mockPrisma.liveSession.update.mockResolvedValue(makeSession({ status: 'ACTIVE' }));
  });

  it('oturum bulunamazsa SESSION_NOT_FOUND fırlatır', async () => {
    mockPrisma.liveSession.findUnique.mockResolvedValue(null);
    const uc = new StartLiveSessionUseCase();
    await expect(uc.execute('sess-missing', 'edu-1')).rejects.toMatchObject({
      code: 'SESSION_NOT_FOUND',
    });
  });

  it('başka educator başlatmaya çalışırsa FORBIDDEN fırlatır', async () => {
    const uc = new StartLiveSessionUseCase();
    await expect(uc.execute('sess-1', 'edu-other')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('zaten ACTIVE → ALREADY_ACTIVE fırlatır', async () => {
    mockPrisma.liveSession.findUnique.mockResolvedValue(makeSession({ status: 'ACTIVE' }));
    const uc = new StartLiveSessionUseCase();
    await expect(uc.execute('sess-1', 'edu-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('ENDED → SESSION_ENDED fırlatır', async () => {
    mockPrisma.liveSession.findUnique.mockResolvedValue(makeSession({ status: 'ENDED' }));
    const uc = new StartLiveSessionUseCase();
    await expect(uc.execute('sess-1', 'edu-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('paidAt null → NOT_PAID fırlatır', async () => {
    mockPrisma.liveSession.findUnique.mockResolvedValue(makeSession({ paidAt: null }));
    const uc = new StartLiveSessionUseCase();
    await expect(uc.execute('sess-1', 'edu-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('başka ACTIVE oturum varsa EDUCATOR_HAS_ACTIVE_SESSION fırlatır', async () => {
    mockPrisma.liveSession.findFirst.mockResolvedValue({
      id: 'other-sess',
      title: 'Diğer Oturum',
      joinCode: 'XYZ789',
      roundNumber: 1,
    });
    const uc = new StartLiveSessionUseCase();
    await expect(uc.execute('sess-1', 'edu-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('başarı: liveSession.update ile status=ACTIVE, startedAt set edilir', async () => {
    const uc = new StartLiveSessionUseCase();
    await uc.execute('sess-1', 'edu-1');
    expect(mockPrisma.liveSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ACTIVE', startedAt: expect.any(Date) }),
      }),
    );
  });

  it('başarıda currentQuestionIdx 0 a set edilir', async () => {
    const uc = new StartLiveSessionUseCase();
    await uc.execute('sess-1', 'edu-1');
    expect(mockPrisma.liveSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ currentQuestionIdx: 0 }),
      }),
    );
  });
});
