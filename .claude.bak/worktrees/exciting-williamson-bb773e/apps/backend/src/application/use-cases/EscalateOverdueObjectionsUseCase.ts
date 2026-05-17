import { IObjectionRepository } from '../../domain/interfaces/IObjectionRepository';
import { IAuditLogRepository } from '../../domain/interfaces/IAuditLogRepository';
import type { Objection } from '../../domain/entities/Objection';

export class EscalateOverdueObjectionsUseCase {
  constructor(private readonly objectionRepo: IObjectionRepository, private readonly auditRepo: IAuditLogRepository) {}

  async execute(days = 10) {
    const rows = await this.objectionRepo.findOverdueOpenObjections(days);
    if (!rows.length) return { count: 0 };
    const ids = rows.map((r: Objection) => r.id);
    const updatedCount = await this.objectionRepo.markEscalated(ids);
    await this.auditRepo.create({
      action: 'OBJECTION_ESCALATED',
      entityType: 'Objection',
      entityId: ids[0],
      actorId: null,
      metadata: { count: updatedCount, sampleIds: ids.slice(0, 5) },
    });
    return { count: updatedCount, ids };
  }
}

