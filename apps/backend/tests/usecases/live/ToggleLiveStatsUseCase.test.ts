/**
 * ToggleLiveStatsUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - Oturum bulunamazsa SESSION_NOT_FOUND fırlatır
 * - Eğitici uyuşmazsa FORBIDDEN fırlatır
 * - showStats toggle: false → true
 * - showStats toggle: true → false
 */

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    liveSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { ToggleLiveStatsUseCase } from '../../../src/application/use-cases/live/ToggleLiveStatsUseCase';
import { prisma } from '../../../src/infrastructure/database/prisma';

const mockPrisma = prisma as any;

describe('ToggleLiveStatsUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('oturum bulunamazsa SESSION_NOT_FOUND fırlatır', async () => {
    mockPrisma.liveSession.findUnique.mockResolvedValue(null);
    const uc = new ToggleLiveStatsUseCase();
    await expect(uc.execute('sess-1', 'edu-1')).rejects.toMatchObject({ code: 'SESSION_NOT_FOUND' });
  });

  it('başka eğiticinin oturumu FORBIDDEN fırlatır', async () => {
    mockPrisma.liveSession.findUnique.mockResolvedValue({ id: 'sess-1', educatorId: 'edu-2', showStats: false });
    const uc = new ToggleLiveStatsUseCase();
    await expect(uc.execute('sess-1', 'edu-1')).rejects.toMatchObject({ message: expect.stringContaining('Not your session') });
  });

  it('showStats false iken true\'ya döner', async () => {
    mockPrisma.liveSession.findUnique.mockResolvedValue({ id: 'sess-1', educatorId: 'edu-1', showStats: false });
    mockPrisma.liveSession.update.mockResolvedValue({ id: 'sess-1', showStats: true });
    const uc = new ToggleLiveStatsUseCase();
    await uc.execute('sess-1', 'edu-1');
    expect(mockPrisma.liveSession.update).toHaveBeenCalledWith({
      where: { id: 'sess-1' },
      data: { showStats: true },
    });
  });

  it('showStats true iken false\'ya döner', async () => {
    mockPrisma.liveSession.findUnique.mockResolvedValue({ id: 'sess-1', educatorId: 'edu-1', showStats: true });
    mockPrisma.liveSession.update.mockResolvedValue({ id: 'sess-1', showStats: false });
    const uc = new ToggleLiveStatsUseCase();
    await uc.execute('sess-1', 'edu-1');
    expect(mockPrisma.liveSession.update).toHaveBeenCalledWith({
      where: { id: 'sess-1' },
      data: { showStats: false },
    });
  });
});
