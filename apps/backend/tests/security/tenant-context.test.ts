import {
  getTenantContext,
  runWithTenant,
  runWithoutTenantFilter,
} from '../../src/common/tenantContext';

describe('tenantContext (AsyncLocalStorage)', () => {
  it('store dışında getTenantContext undefined döner', () => {
    expect(getTenantContext()).toBeUndefined();
  });

  it('runWithTenant context\'i set eder', () => {
    runWithTenant({ tenantId: 't-1' }, () => {
      expect(getTenantContext()).toEqual({ tenantId: 't-1' });
    });
  });

  it('iç içe runWithTenant en içteki değeri okur', () => {
    runWithTenant({ tenantId: 't-outer' }, () => {
      expect(getTenantContext()?.tenantId).toBe('t-outer');
      runWithTenant({ tenantId: 't-inner' }, () => {
        expect(getTenantContext()?.tenantId).toBe('t-inner');
      });
      expect(getTenantContext()?.tenantId).toBe('t-outer');
    });
  });

  it('runWithoutTenantFilter bypass:true set eder', () => {
    runWithTenant({ tenantId: 't-1' }, () => {
      runWithoutTenantFilter(() => {
        const ctx = getTenantContext();
        expect(ctx?.bypass).toBe(true);
        // tenantId korunur, sadece bypass flag eklenir
        expect(ctx?.tenantId).toBe('t-1');
      });
      // bypass dışı scope'ta flag yok
      expect(getTenantContext()?.bypass).toBeUndefined();
    });
  });

  it('async sınırlarda context korunur', async () => {
    await runWithTenant({ tenantId: 't-async' }, async () => {
      await new Promise((r) => setTimeout(r, 5));
      expect(getTenantContext()?.tenantId).toBe('t-async');
      await Promise.resolve();
      expect(getTenantContext()?.tenantId).toBe('t-async');
    });
  });

  it('paralel async\'lerde context\'ler izole', async () => {
    const results = await Promise.all([
      runWithTenant({ tenantId: 't-A' }, async () => {
        await new Promise((r) => setTimeout(r, 10));
        return getTenantContext()?.tenantId;
      }),
      runWithTenant({ tenantId: 't-B' }, async () => {
        await new Promise((r) => setTimeout(r, 5));
        return getTenantContext()?.tenantId;
      }),
    ]);
    expect(results).toEqual(['t-A', 't-B']);
  });
});
