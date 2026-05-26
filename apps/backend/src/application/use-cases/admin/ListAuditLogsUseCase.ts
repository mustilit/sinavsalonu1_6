import type { IAuditLogRepository } from '../../../domain/interfaces/IAuditLogRepository';
import { runWithoutTenantFilter } from '../../../common/tenantContext';

/**
 * Sistem denetim kayıtlarını filtreli listeler.
 * Tarih aralığı, eylem türü, aktör veya entity'ye göre filtreleme desteklenir.
 * Yalnızca admin panelinden erişilebilir.
 *
 * Tenant bypass: Admin cross-tenant audit log görüntüleyebilir; aksi halde
 * legacy kayıtlar (tenantId=null) veya başka tenant'taki kayıtlar gözükmez.
 */
export class ListAuditLogsUseCase {
  constructor(private readonly auditRepo: IAuditLogRepository) {}

  async execute(filters?: {
    action?: string;
    entityType?: string;
    entityId?: string;
    actorId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const from = filters?.from ? new Date(filters.from) : undefined;
    const to = filters?.to ? new Date(filters.to) : undefined;
    return runWithoutTenantFilter(() =>
      this.auditRepo.list({
        action: filters?.action,
        entityType: filters?.entityType,
        entityId: filters?.entityId,
        actorId: filters?.actorId,
        from,
        to,
        page: filters?.page,
        limit: filters?.limit,
      }),
    );
  }
}
