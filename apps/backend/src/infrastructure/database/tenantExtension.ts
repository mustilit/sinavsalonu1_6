import { Prisma } from '@prisma/client';
import { getTenantContext } from '../../common/tenantContext';

/**
 * Tenant-aware Prisma client extension.
 *
 * AsyncLocalStorage'dan okunan request-scoped tenantId'yi, tenantId kolonuna
 * sahip modellerin liste/sayım/toplu update/delete sorgularına AND filter olarak
 * inject eder. Tek-kayıt id lookup'ları (findUnique, update, delete) bu hook
 * dışındadır — developer'ın sonradan tenantId doğrulaması yapması gerekir.
 *
 * Context yoksa (cron, scheduler, manuel script) veya context.bypass=true ise
 * filter eklenmez — escape hatch.
 */

// tenantId String kolonuna sahip tüm Prisma modelleri.
// Yeni model eklenince buraya da eklenmeli.
const TENANT_AWARE_MODELS = new Set<string>([
  'AdPurchase',
  'AuditLog',
  'BackupLog',
  'BlockedTerm',
  'EducatorRiskScore',
  'EmailEvent',
  'EmailLog',
  'EmailProviderConfig',
  'EmailTemplate',
  'ExamTest',
  'ModerationAction',
  'ModerationResult',
  'ModerationViolation',
  'PackageView',
  'Purchase',
  'Subscription',
  'SuppressedEmail',
  'TestPackage',
  'User',
]);

const FILTERED_OPERATIONS = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'updateMany',
  'deleteMany',
]);

const injectTenantFilter = (
  args: any,
  tenantId: string,
): any => {
  const next = { ...(args ?? {}) };
  const existingWhere = next.where ?? {};

  // where'de zaten tenantId varsa (developer kasıtlı override) dokunma.
  if (Object.prototype.hasOwnProperty.call(existingWhere, 'tenantId')) {
    return next;
  }

  next.where = { AND: [{ tenantId }, existingWhere] };
  return next;
};

export const tenantExtension = Prisma.defineExtension({
  name: 'tenantScope',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!model || !FILTERED_OPERATIONS.has(operation)) {
          return query(args);
        }
        if (!TENANT_AWARE_MODELS.has(model)) {
          return query(args);
        }
        const ctx = getTenantContext();
        if (!ctx || ctx.bypass || !ctx.tenantId) {
          return query(args);
        }
        return query(injectTenantFilter(args, ctx.tenantId));
      },
    },
  },
});
