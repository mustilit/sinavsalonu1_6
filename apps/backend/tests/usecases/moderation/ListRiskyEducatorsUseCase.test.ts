/**
 * ListRiskyEducatorsUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - Başarılı listede items ve nextCursor döner
 * - riskLevels filtresi where kısmına geçer
 * - Cursor pagination çalışır
 * - User bilgisi items'e eklenir
 */

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    educatorRiskScore: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
  },
}));

import { ListRiskyEducatorsUseCase } from '../../../src/application/use-cases/moderation/ListRiskyEducatorsUseCase';
import { prisma } from '../../../src/infrastructure/database/prisma';

const mockPrisma = prisma as any;

const makeScore = (userId: string, score: number) => ({
  id: `score-${userId}`,
  userId,
  riskLevel: 'HIGH',
  computedScore: score,
  violationCount: 5,
  openViolations: 2,
  highSeverityCount: 1,
  lastViolationAt: new Date(),
  lastComputedAt: new Date(),
});

describe('ListRiskyEducatorsUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('başarılı listede user bilgisi eklenir', async () => {
    mockPrisma.educatorRiskScore.findMany.mockResolvedValue([makeScore('edu-1', 80)]);
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'edu-1', username: 'edu1', email: 'edu1@test.com', suspendedUntil: null, isBanned: false },
    ]);
    const uc = new ListRiskyEducatorsUseCase();
    const result = await uc.execute({ tenantId: 'tenant-1' });
    expect(result.items[0].user?.username).toBe('edu1');
  });

  it('limit+1 kayıt olduğunda nextCursor dolu olur', async () => {
    const scores = Array.from({ length: 4 }, (_, i) => makeScore(`edu-${i}`, 80 - i));
    mockPrisma.educatorRiskScore.findMany.mockResolvedValue(scores);
    mockPrisma.user.findMany.mockResolvedValue([]);
    const uc = new ListRiskyEducatorsUseCase();
    const result = await uc.execute({ tenantId: 'tenant-1', limit: 3 });
    expect(result.items).toHaveLength(3);
    expect(result.nextCursor).not.toBeNull();
  });

  it('riskLevels filtresi where kısmına geçer', async () => {
    mockPrisma.educatorRiskScore.findMany.mockResolvedValue([]);
    mockPrisma.user.findMany.mockResolvedValue([]);
    const uc = new ListRiskyEducatorsUseCase();
    await uc.execute({ tenantId: 'tenant-1', riskLevels: ['HIGH' as any] });
    const call = mockPrisma.educatorRiskScore.findMany.mock.calls[0][0];
    expect(call.where).toMatchObject({ riskLevel: { in: ['HIGH'] } });
  });

  it('boş listede nextCursor:null döner', async () => {
    mockPrisma.educatorRiskScore.findMany.mockResolvedValue([]);
    mockPrisma.user.findMany.mockResolvedValue([]);
    const uc = new ListRiskyEducatorsUseCase();
    const result = await uc.execute({ tenantId: 'tenant-1' });
    expect(result.nextCursor).toBeNull();
  });
});
