/**
 * GetMyModerationStatusUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - riskScore yoksa null döner
 * - riskScore varsa riskLevel, computedScore bilgileri döner
 * - recentViolations döner
 * - isBanned: false varsayılan
 * - user bulunamazsa isBanned ve suspendedUntil null döner
 */

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    moderationViolation: { findMany: jest.fn() },
    moderationAction: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
  },
}));

import { GetMyModerationStatusUseCase } from '../../../src/application/use-cases/moderation/GetMyModerationStatusUseCase';
import { prisma } from '../../../src/infrastructure/database/prisma';

const mockPrisma = prisma as any;

function makeRiskRepo(score: Record<string, unknown> | null) {
  return { findByUser: jest.fn().mockResolvedValue(score) };
}

const makeScore = () => ({
  riskLevel: 'MEDIUM',
  computedScore: 45,
  violationCount: 3,
  openViolations: 1,
  highSeverityCount: 0,
  lastViolationAt: new Date(),
});

describe('GetMyModerationStatusUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.moderationViolation.findMany.mockResolvedValue([]);
    mockPrisma.moderationAction.findFirst.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue({ isBanned: false, suspendedUntil: null });
  });

  it('riskScore yoksa riskScore:null döner', async () => {
    const riskRepo = makeRiskRepo(null);
    const uc = new GetMyModerationStatusUseCase(riskRepo as any);
    const result = await uc.execute('edu-1', 'tenant-1');
    expect(result.riskScore).toBeNull();
  });

  it('riskScore varsa riskLevel bilgisi döner', async () => {
    const riskRepo = makeRiskRepo(makeScore());
    const uc = new GetMyModerationStatusUseCase(riskRepo as any);
    const result = await uc.execute('edu-1', 'tenant-1');
    expect(result.riskScore?.riskLevel).toBe('MEDIUM');
    expect(result.riskScore?.computedScore).toBe(45);
  });

  it('recentViolations listesi döner', async () => {
    mockPrisma.moderationViolation.findMany.mockResolvedValue([
      { id: 'v-1', category: 'HATE_SPEECH', severity: 'HIGH', status: 'OPEN', createdAt: new Date(), entityType: 'ExamQuestion' },
    ]);
    const riskRepo = makeRiskRepo(null);
    const uc = new GetMyModerationStatusUseCase(riskRepo as any);
    const result = await uc.execute('edu-1', 'tenant-1');
    expect(result.recentViolations).toHaveLength(1);
  });

  it('isBanned false ise false döner', async () => {
    const riskRepo = makeRiskRepo(null);
    const uc = new GetMyModerationStatusUseCase(riskRepo as any);
    const result = await uc.execute('edu-1', 'tenant-1');
    expect(result.isBanned).toBe(false);
  });

  it('user bulunamazsa isBanned false ve suspendedUntil null döner', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const riskRepo = makeRiskRepo(null);
    const uc = new GetMyModerationStatusUseCase(riskRepo as any);
    const result = await uc.execute('edu-1', 'tenant-1');
    expect(result.isBanned).toBe(false);
    expect(result.suspendedUntil).toBeNull();
  });
});
