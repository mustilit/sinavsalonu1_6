/**
 * RecordModerationViolationUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - violationRepo.create çağrılır, ihlal kaydı döner
 * - recompute (risk skoru) tetiklenir
 * - moderationResultId null ise null olarak geçirilir
 */

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    adminSettings: {
      findFirst: jest.fn().mockResolvedValue({
        moderationAutoSuspendThreshold: 80,
        moderationAutoBanThreshold: 95,
      }),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ isBanned: false, suspendedUntil: null }),
      update: jest.fn().mockResolvedValue({}),
    },
    // $transaction: RecomputeRisk kullanabilir — auto-suspend/ban eşiğinin altında skor
    $transaction: jest.fn().mockImplementation(async (cb: any) => cb({
      user: { update: jest.fn().mockResolvedValue({}) },
      moderationAction: { create: jest.fn().mockResolvedValue({}) },
    })),
  },
}));

import { RecordModerationViolationUseCase } from '../../../src/application/use-cases/moderation/RecordModerationViolationUseCase';

function makeViolationRepo() {
  return {
    create: jest.fn().mockResolvedValue({ id: 'viol-1', category: 'HATE_SPEECH', severity: 3 }),
    findOpenByUser: jest.fn().mockResolvedValue([]),
    countByUser: jest.fn().mockResolvedValue(0),
    findById: jest.fn().mockResolvedValue(null),
  };
}

function makeRiskRepo() {
  return {
    findByUser: jest.fn().mockResolvedValue(null),
    upsert: jest.fn().mockResolvedValue({}),
  };
}

function makeActionRepo() {
  return {
    create: jest.fn().mockResolvedValue({}),
    findById: jest.fn(),
    findByUser: jest.fn().mockResolvedValue([]),
    findActivesuspension: jest.fn().mockResolvedValue(null),
  };
}

const BASE_PARAMS = {
  tenantId: 't1',
  userId: 'edu-1',
  category: 'HATE_SPEECH' as any,
  severity: 3,
  entityType: 'ExamQuestion',
  entityId: 'q1',
};

describe('RecordModerationViolationUseCase', () => {
  it('violationRepo.create çağrılır', async () => {
    const violationRepo = makeViolationRepo();
    const uc = new RecordModerationViolationUseCase(
      violationRepo as any,
      makeRiskRepo() as any,
      makeActionRepo() as any,
    );

    const result = await uc.execute(BASE_PARAMS);

    expect(violationRepo.create).toHaveBeenCalledTimes(1);
    expect(violationRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'HATE_SPEECH', severity: 3 }),
    );
    expect(result.id).toBe('viol-1');
  });

  it('moderationResultId null ise null olarak geçirilir', async () => {
    const violationRepo = makeViolationRepo();
    const uc = new RecordModerationViolationUseCase(
      violationRepo as any,
      makeRiskRepo() as any,
      makeActionRepo() as any,
    );

    await uc.execute({ ...BASE_PARAMS, moderationResultId: null });

    expect(violationRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ moderationResultId: null }),
    );
  });

  it('risk skoru yeniden hesaplama tetiklenir (riskRepo.upsert çağrılır)', async () => {
    const riskRepo = makeRiskRepo();
    const uc = new RecordModerationViolationUseCase(
      makeViolationRepo() as any,
      riskRepo as any,
      makeActionRepo() as any,
    );

    await uc.execute(BASE_PARAMS);

    expect(riskRepo.upsert).toHaveBeenCalledTimes(1);
  });

  it('adminNote geçilirse violationRepo.create a yansıtılır', async () => {
    const violationRepo = makeViolationRepo();
    const uc = new RecordModerationViolationUseCase(
      violationRepo as any,
      makeRiskRepo() as any,
      makeActionRepo() as any,
    );

    await uc.execute({ ...BASE_PARAMS, adminNote: 'Manuel not' });

    expect(violationRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ adminNote: 'Manuel not' }),
    );
  });
});
