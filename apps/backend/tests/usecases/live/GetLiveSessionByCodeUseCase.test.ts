/**
 * GetLiveSessionByCodeUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - Oturum bulunamazsa → SESSION_NOT_FOUND
 * - Büyük harfe çevrilerek aranır (toLowerCase girdi tolere edilir)
 * - Başarı: session bilgileri döner
 */

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    liveSession: { findUnique: jest.fn() },
  },
}));

import { GetLiveSessionByCodeUseCase } from '../../../src/application/use-cases/live/GetLiveSessionByCodeUseCase';
import { prisma } from '../../../src/infrastructure/database/prisma';
import { AppError } from '../../../src/application/errors/AppError';

const mockPrisma = prisma as any;

describe('GetLiveSessionByCodeUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('oturum bulunamazsa SESSION_NOT_FOUND fırlatır', async () => {
    mockPrisma.liveSession.findUnique.mockResolvedValue(null);
    const uc = new GetLiveSessionByCodeUseCase();
    await expect(uc.execute('BADCODE')).rejects.toMatchObject({ code: 'SESSION_NOT_FOUND' });
  });

  it('küçük harf kod büyük harfe çevrilerek aranır', async () => {
    mockPrisma.liveSession.findUnique.mockResolvedValue({ id: 'sess-1', joinCode: 'ABC123' });
    const uc = new GetLiveSessionByCodeUseCase();
    await uc.execute('abc123');
    expect(mockPrisma.liveSession.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { joinCode: 'ABC123' } }),
    );
  });

  it('başarı: session bilgileri döner', async () => {
    const session = {
      id: 'sess-1',
      title: 'Canlı Sınav',
      status: 'ACTIVE',
      joinCode: 'ABC123',
      maxParticipants: 50,
      roundNumber: 1,
      educator: { id: 'edu-1', username: 'educator' },
      _count: { questions: 5, participants: 20 },
    };
    mockPrisma.liveSession.findUnique.mockResolvedValue(session);
    const uc = new GetLiveSessionByCodeUseCase();
    const result = await uc.execute('ABC123');
    expect(result.id).toBe('sess-1');
    expect(result.joinCode).toBe('ABC123');
  });
});
