import { PurchaseUseCase } from '../../src/application/use-cases/PurchaseUseCase';

describe('PurchaseUseCase', () => {
  it('creates purchase and attempt and audit', async () => {
    const fakePrisma: any = {
      adminSettings: { findFirst: async () => ({ id: 1, purchasesEnabled: true }) },
      examTest: { findUnique: async ({ where }: any) => ({ id: where.id, status: 'PUBLISHED', currency: 'TRY', priceCents: 1250 }) },
      user: { findUnique: async () => ({ id: 'u1', status: 'ACTIVE' }) },
      discountCode: { findUnique: async () => null },
      $transaction: async (fn: any) => {
        const tx = {
          purchase: { create: async (d: any) => ({ id: 'p1', ...d.data }) },
          testAttempt: { create: async (d: any) => ({ id: 'a1', ...d.data }) },
          auditLog: { create: async (d: any) => ({ id: 'al1', ...d.data }) },
        };
        return fn(tx);
      },
    };
    const uc = new PurchaseUseCase(fakePrisma);
    const res = await uc.execute('t1', 'u1');
    expect(res.purchase).toBeDefined();
    expect(res.attempt).toBeDefined();
  });

  it('throws conflict on duplicate (P2002)', async () => {
    const fakePrisma: any = {
      adminSettings: { findFirst: async () => ({ id: 1, purchasesEnabled: true }) },
      examTest: { findUnique: async ({ where }: any) => ({ id: where.id, status: 'PUBLISHED', priceCents: 1000 }) },
      user: { findUnique: async () => ({ id: 'u1', status: 'ACTIVE' }) },
      discountCode: { findUnique: async () => null },
      $transaction: async (fn: any) => {
        const tx = {
          purchase: { create: async () => { const e: any = new Error('unique'); (e as any).code = 'P2002'; throw e; } },
          testAttempt: { create: async () => null },
          auditLog: { create: async () => null },
        };
        return fn(tx);
      },
    };
    const uc = new PurchaseUseCase(fakePrisma);
    await expect(uc.execute('t1', 'u1')).rejects.toThrow();
  });

  it('FR-Y-05: rejects when purchasesEnabled=false', async () => {
    const fakePrisma: any = {
      adminSettings: { findFirst: async () => ({ id: 1, purchasesEnabled: false }) },
    };
    const uc = new PurchaseUseCase(fakePrisma);
    await expect(uc.execute('t1', 'u1')).rejects.toThrow(/suspended|PURCHASES_DISABLED/i);
  });

  it('rejects discount over 50%', async () => {
    const fakePrisma: any = {
      adminSettings: { findFirst: async () => ({ id: 1, purchasesEnabled: true }) },
      examTest: { findUnique: async ({ where }: any) => ({ id: where.id, status: 'PUBLISHED', priceCents: 2000 }) },
      user: { findUnique: async () => ({ id: 'u1', status: 'ACTIVE' }) },
      discountCode: { findFirst: async () => ({ id: 'd1', code: 'X', percentOff: 60, usedCount: 0, maxUses: null }) },
      $transaction: async (fn: any) => {
        const tx = {
          purchase: { create: async (d: any) => ({ id: 'p1', ...d.data }) },
          testAttempt: { create: async (d: any) => ({ id: 'a1', ...d.data }) },
          auditLog: { create: async (d: any) => ({ id: 'al1', ...d.data }) },
        };
        return fn(tx);
      },
    };
    const uc = new PurchaseUseCase(fakePrisma);
    await expect(uc.execute('t1', 'u1', 'X')).rejects.toThrow();
  });
});

