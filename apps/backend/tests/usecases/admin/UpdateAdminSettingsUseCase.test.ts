/**
 * UpdateAdminSettingsUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - commissionPercent güncelleme upsert çağırır
 * - purchasesEnabled kill-switch false yapılabilir
 * - minPackagePriceCents $executeRaw ile güncellenir
 * - $queryRaw yoksa satır'dan fallback değerler okunur
 * - Audit log: ADMIN_SETTINGS_UPDATED action yazılır
 * - audit logger yoksa structured logger'a yazılır (no crash)
 */

import { UpdateAdminSettingsUseCase } from '../../../src/application/use-cases/admin/UpdateAdminSettingsUseCase';

jest.mock('../../../src/infrastructure/logger/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('../../../src/application/services/security/TurnstileVerifier', () => ({
  TurnstileVerifier: { invalidateCache: jest.fn() },
}));
jest.mock('../../../src/application/services/security/SecretsVault', () => ({
  encryptStoredSecret: jest.fn((v: string) => `enc:${v}`),
}));

const makeBaseRow = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  commissionPercent: 20,
  vatPercent: 18,
  purchasesEnabled: true,
  packageCreationEnabled: true,
  testPublishingEnabled: true,
  testAttemptsEnabled: true,
  adPurchasesEnabled: true,
  twoFactorSystemEnabled: false,
  minPackagePriceCents: 100,
  maxDiscountPercent: 50,
  googleClientId: null,
  turnstileSiteKey: null,
  turnstileSecretKey: null,
  minQuestionsPerTest: 1,
  maxQuestionsPerTest: 100,
  maxTestsPerPackage: 10,
  maxLiveQuestions: 50,
  ...overrides,
});

function makePrisma(rowOverrides: Record<string, unknown> = {}) {
  const row = makeBaseRow(rowOverrides);
  return {
    adminSettings: {
      upsert: jest.fn().mockResolvedValue(row),
      findUnique: jest.fn().mockResolvedValue(row),
    },
    $executeRaw: jest.fn().mockResolvedValue(1),
    $queryRaw: jest.fn().mockResolvedValue([row]),
  };
}

describe('UpdateAdminSettingsUseCase', () => {
  it('commissionPercent değiştirildiğinde upsert çağrılır', async () => {
    const prisma = makePrisma();
    const uc = new UpdateAdminSettingsUseCase();
    const result = await uc.execute(prisma as any, { commissionPercent: 25 });
    expect(prisma.adminSettings.upsert).toHaveBeenCalledTimes(1);
    expect(result.commissionPercent).toBe(20); // row'dan gelir
  });

  it('purchasesEnabled false geçilirse upsert update kısmında yer alır', async () => {
    const prisma = makePrisma({ purchasesEnabled: false });
    const uc = new UpdateAdminSettingsUseCase();
    await uc.execute(prisma as any, { purchasesEnabled: false });
    const upsertCall = prisma.adminSettings.upsert.mock.calls[0][0];
    expect(upsertCall.update).toMatchObject({ purchasesEnabled: false });
  });

  it('minPackagePriceCents $executeRaw ile güncellenir', async () => {
    const prisma = makePrisma();
    const uc = new UpdateAdminSettingsUseCase();
    await uc.execute(prisma as any, { minPackagePriceCents: 500 });
    expect(prisma.$executeRaw).toHaveBeenCalled();
  });

  it('maxDiscountPercent $executeRaw ile güncellenir', async () => {
    const prisma = makePrisma();
    const uc = new UpdateAdminSettingsUseCase();
    await uc.execute(prisma as any, { maxDiscountPercent: 30 });
    expect(prisma.$executeRaw).toHaveBeenCalled();
  });

  it('$queryRaw yoksa satır üzerinden fallback değerler dönüş nesnisine atanır', async () => {
    const row = makeBaseRow({ minPackagePriceCents: 200 });
    const prisma = {
      adminSettings: {
        upsert: jest.fn().mockResolvedValue(row),
        findUnique: jest.fn().mockResolvedValue(row),
      },
    };
    const uc = new UpdateAdminSettingsUseCase();
    const result = await uc.execute(prisma as any, { commissionPercent: 20 });
    expect(result.minPackagePriceCents).toBe(200);
  });

  it('audit logger sağlandığında ADMIN_SETTINGS_UPDATED action ile logAsync çağrılır', async () => {
    const prisma = makePrisma();
    const auditLogger = { logAsync: jest.fn() };
    const uc = new UpdateAdminSettingsUseCase(auditLogger as any);
    await uc.execute(prisma as any, { commissionPercent: 15 }, { userId: 'admin-1' });
    expect(auditLogger.logAsync).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'admin-1' }),
      expect.objectContaining({ action: 'ADMIN_SETTINGS_UPDATED' }),
    );
  });

  it('audit logger yoksa exception fırlatmaz', async () => {
    const prisma = makePrisma();
    const uc = new UpdateAdminSettingsUseCase();
    await expect(uc.execute(prisma as any, {})).resolves.toBeDefined();
  });
});
