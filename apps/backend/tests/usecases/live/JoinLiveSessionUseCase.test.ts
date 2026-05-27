/**
 * JoinLiveSessionUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - Oturum bulunamazsa → SESSION_NOT_FOUND
 * - ENDED oturum → SESSION_ENDED
 * - DRAFT oturum → SESSION_NOT_STARTED
 * - Kullanıcı bulunamazsa → USER_NOT_FOUND
 * - Kullanıcı aktif değilse → USER_NOT_ACTIVE
 * - Round 2 ve round 1 katılımı yoksa → NOT_IN_ROUND1
 * - Kapasite dolu → SESSION_FULL (race condition: updateMany count=0)
 * - Başarı: participant oluşturulur, sessionId + participantId döner
 * - Mevcut katılımcı → upsert idempotent, kapasite artırılmaz
 */

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    liveSession: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    liveParticipant: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    user: { findUnique: jest.fn() },
  },
}));

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { JoinLiveSessionUseCase } from '../../../src/application/use-cases/live/JoinLiveSessionUseCase';
import { prisma } from '../../../src/infrastructure/database/prisma';
import { AppError } from '../../../src/application/errors/AppError';

const mockPrisma = prisma as any;

function makeSession(overrides: Record<string, any> = {}) {
  return {
    id: 'sess-1',
    educatorId: 'edu-1',
    joinCode: 'ABC123',
    status: 'ACTIVE',
    maxParticipants: null,
    currentParticipantCount: 5,
    roundNumber: 1,
    parentSessionId: null,
    ...overrides,
  };
}

function makeUser(overrides: Record<string, any> = {}) {
  return { id: 'u1', status: 'ACTIVE', ...overrides };
}

function makeParticipant() {
  return { id: 'part-1', sessionId: 'sess-1', userId: 'u1' };
}

describe('JoinLiveSessionUseCase', () => {
  beforeEach(() => {
    // resetAllMocks: hem call history hem implementation sıfırlar
    jest.resetAllMocks();
    mockPrisma.liveSession.findUnique.mockResolvedValue(makeSession());
    mockPrisma.user.findUnique.mockResolvedValue(makeUser());
    mockPrisma.liveParticipant.findUnique.mockResolvedValue(null);
    mockPrisma.liveSession.update.mockResolvedValue(makeSession());
    mockPrisma.liveSession.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.liveParticipant.upsert.mockResolvedValue(makeParticipant());
  });

  it('oturum bulunamazsa SESSION_NOT_FOUND fırlatır', async () => {
    mockPrisma.liveSession.findUnique.mockResolvedValue(null);
    const uc = new JoinLiveSessionUseCase();
    await expect(uc.execute('BADCODE', 'u1')).rejects.toMatchObject({ code: 'SESSION_NOT_FOUND' });
  });

  it('ENDED oturum → SESSION_ENDED fırlatır', async () => {
    mockPrisma.liveSession.findUnique.mockResolvedValue(makeSession({ status: 'ENDED' }));
    const uc = new JoinLiveSessionUseCase();
    await expect(uc.execute('ABC123', 'u1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('DRAFT oturum → SESSION_NOT_STARTED fırlatır', async () => {
    mockPrisma.liveSession.findUnique.mockResolvedValue(makeSession({ status: 'DRAFT' }));
    const uc = new JoinLiveSessionUseCase();
    await expect(uc.execute('ABC123', 'u1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('kullanıcı bulunamazsa USER_NOT_FOUND fırlatır', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const uc = new JoinLiveSessionUseCase();
    await expect(uc.execute('ABC123', 'u-missing')).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
  });

  it('kullanıcı SUSPENDED ise USER_NOT_ACTIVE fırlatır', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeUser({ status: 'SUSPENDED' }));
    const uc = new JoinLiveSessionUseCase();
    await expect(uc.execute('ABC123', 'u1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('Round 2 için round 1 katılımı yoksa NOT_IN_ROUND1 fırlatır', async () => {
    mockPrisma.liveSession.findUnique.mockResolvedValue(
      makeSession({ roundNumber: 2, parentSessionId: 'sess-parent' }),
    );
    // Round 1 participant yok
    mockPrisma.liveParticipant.findUnique.mockResolvedValue(null);
    const uc = new JoinLiveSessionUseCase();
    await expect(uc.execute('ABC123', 'u1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('kapasite dolu (updateMany count=0) → SESSION_FULL fırlatır', async () => {
    mockPrisma.liveSession.findUnique.mockResolvedValue(
      makeSession({ maxParticipants: 5, currentParticipantCount: 5 }),
    );
    mockPrisma.liveSession.updateMany.mockResolvedValue({ count: 0 }); // dolu
    const uc = new JoinLiveSessionUseCase();
    await expect(uc.execute('ABC123', 'u1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('başarı: participant oluşturulur, sessionId + participantId döner', async () => {
    const uc = new JoinLiveSessionUseCase();
    const result = await uc.execute('ABC123', 'u1');
    expect(mockPrisma.liveParticipant.upsert).toHaveBeenCalledTimes(1);
    expect(result.sessionId).toBe('sess-1');
    expect(result.participantId).toBe('part-1');
  });

  it('mevcut katılımcı → liveSession.update çağrılmaz (kapasite artırılmaz)', async () => {
    // Katılımcı zaten kayıtlı
    mockPrisma.liveParticipant.findUnique
      .mockResolvedValueOnce(makeParticipant()) // round 1 yok kontrolü bypass
      .mockResolvedValueOnce(makeParticipant()); // existing participant check
    // İlk çağrı round1 check için, ikinci existing check için
    mockPrisma.liveParticipant.findUnique.mockResolvedValue(makeParticipant());

    const uc = new JoinLiveSessionUseCase();
    await uc.execute('ABC123', 'u1');

    // Kapasite güncelleme çağrılmaz
    expect(mockPrisma.liveSession.update).not.toHaveBeenCalled();
    expect(mockPrisma.liveSession.updateMany).not.toHaveBeenCalled();
  });

  it('limitsiz oturum → liveSession.update increment çağrılır', async () => {
    mockPrisma.liveSession.findUnique.mockResolvedValue(makeSession({ maxParticipants: null }));
    const uc = new JoinLiveSessionUseCase();
    await uc.execute('ABC123', 'u1');
    expect(mockPrisma.liveSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ currentParticipantCount: { increment: 1 } }),
      }),
    );
  });
});
