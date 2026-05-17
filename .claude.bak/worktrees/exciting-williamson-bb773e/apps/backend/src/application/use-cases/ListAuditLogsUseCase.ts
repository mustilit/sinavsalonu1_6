import type { IAuditLogRepository } from '../../domain/interfaces/IAuditLogRepository';

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
    return this.auditRepo.list({
      action: filters?.action,
      entityType: filters?.entityType,
      entityId: filters?.entityId,
      actorId: filters?.actorId,
      from,
      to,
      page: filters?.page,
      limit: filters?.limit,
    });
  }
}
