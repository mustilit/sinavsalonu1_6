import type { IContractRepository } from '../../domain/interfaces/IContractRepository';
import type { IContractAcceptanceRepository } from '../../domain/interfaces/IContractAcceptanceRepository';
import type { IAuditLogRepository } from '../../domain/interfaces/IAuditLogRepository';
import { AppError } from '../errors/AppError';

export class AcceptContractUseCase {
  constructor(
    private readonly contractRepo: IContractRepository,
    private readonly acceptanceRepo: IContractAcceptanceRepository,
    private readonly auditRepo?: IAuditLogRepository,
  ) {}

  async execute(params: {
    userId: string;
    contractId: string;
    ip?: string;
    userAgent?: string;
  }): Promise<{ acceptedAt: string }> {
    const contract = await this.contractRepo.getById(params.contractId);
    if (!contract) {
      throw new AppError('CONTRACT_NOT_FOUND', 'Contract not found', 404);
    }
    if (!contract.isActive) {
      throw new AppError('CONTRACT_NOT_ACTIVE', 'Contract is not active', 409);
    }

    const existing = await this.acceptanceRepo.findByUserAndContract(params.userId, params.contractId);
    if (existing) {
      return { acceptedAt: existing.acceptedAt.toISOString() };
    }

    const created = await this.acceptanceRepo.create({
      userId: params.userId,
      contractId: params.contractId,
      ip: params.ip,
      userAgent: params.userAgent,
    });

    if (this.auditRepo) {
      try {
        await this.auditRepo.create({
          action: 'CONTRACT_ACCEPTED',
          entityType: 'CONTRACT',
          entityId: params.contractId,
          actorId: params.userId,
          metadata: { acceptanceId: created.id },
        });
      } catch {
        // best-effort
      }
    }

    return { acceptedAt: created.acceptedAt.toISOString() };
  }
}
