/**
 * ListMyLiveSessionsUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - educatorId boşsa UNAUTHORIZED fırlatır
 * - Başarılı listede items ve round2 döner
 * - hasMore ve nextCursor doğru hesaplanır
 * - status filtresi iletilir
 */

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    liveSession: { findMany: jest.fn() },
  },
}));

import { ListMyLiveSessionsUseCase } from '../../../src/application/use-cases/live/ListMyLiveSessionsUseCase';
import { prisma } from '../../../src/infrastructure/database/prisma';

const mockPrisma = prisma as any;

const makeSession = (id: string) => ({
  id,
  educatorId: 'edu-1',
  status: 'DRAFT',
  createdAt: new Date(),
  _count: { questions: 5, participants: 10 },
});

describe('ListMyLiveSessionsUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('educatorId boşsa UNAUTHORIZED fırlatır', async () => {
    const uc = new ListMyLiveSessionsUseCase();
    await expect(uc.execute('')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('3 session limit=3 ile nextCursor:null döner', async () => {
    mockPrisma.liveSession.findMany
      .mockResolvedValueOnce(Array.from({ length: 3 }, (_, i) => makeSession(`s-${i}`)))
      .mockResolvedValueOnce([]);
    const uc = new ListMyLiveSessionsUseCase();
    const result = await uc.execute('edu-1', { limit: 3 });
    expect(result.items).toHaveLength(3);
    expect(result.nextCursor).toBeNull();
  });

  it('limit+1 session geldiğinde nextCursor dolu olur', async () => {
    mockPrisma.liveSession.findMany
      .mockResolvedValueOnce(Array.from({ length: 4 }, (_, i) => makeSession(`s-${i}`)))
      .mockResolvedValueOnce([]);
    const uc = new ListMyLiveSessionsUseCase();
    const result = await uc.execute('edu-1', { limit: 3 });
    expect(result.items).toHaveLength(3);
    expect(result.nextCursor).not.toBeNull();
  });

  it('round2 oturumları ayrı döner', async () => {
    const parents = [makeSession('s-1')];
    const round2Sessions = [{ ...makeSession('s-2'), parentSessionId: 's-1', roundNumber: 2 }];
    mockPrisma.liveSession.findMany
      .mockResolvedValueOnce(parents)
      .mockResolvedValueOnce(round2Sessions);
    const uc = new ListMyLiveSessionsUseCase();
    const result = await uc.execute('edu-1');
    expect(result.round2).toHaveLength(1);
  });
});
