import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContextValue {
  tenantId?: string;
  /** true ise prisma extension tenant filter inject etmez (kasıtlı bypass) */
  bypass?: boolean;
}

const storage = new AsyncLocalStorage<TenantContextValue>();

export const tenantStorage = storage;

/** Mevcut request scope tenant context'i (yoksa undefined). */
export const getTenantContext = (): TenantContextValue | undefined => storage.getStore();

/** Tenant context altında bir async fonksiyon çalıştırır. */
export const runWithTenant = <T>(value: TenantContextValue, fn: () => T): T =>
  storage.run(value, fn);

/**
 * Tenant filter'i geçici olarak devre dışı bırakır. Cross-tenant admin işlemleri
 * veya scheduler/cron'lar tek bir tenant'a kilitli değilse kullanılır.
 */
export const runWithoutTenantFilter = <T>(fn: () => T): T => {
  const current = storage.getStore() ?? {};
  return storage.run({ ...current, bypass: true }, fn);
};
