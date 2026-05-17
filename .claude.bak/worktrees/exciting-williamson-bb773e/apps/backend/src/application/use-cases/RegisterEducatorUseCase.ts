import { randomUUID } from 'crypto';
import { User, UserPublic } from '../../domain/entities/User';
import type { IUserRepository } from '../../domain/interfaces/IUserRepository';
import type { IContractRepository } from '../../domain/interfaces/IContractRepository';
import type { IContractAcceptanceRepository } from '../../domain/interfaces/IContractAcceptanceRepository';
import type { IAuditLogRepository } from '../../domain/interfaces/IAuditLogRepository';
import { PasswordService } from '../../infrastructure/services/PasswordService';
import { JwtService } from '../../infrastructure/services/JwtService';
import { AppError } from '../errors/AppError';

/** FR-E-01: Eğitici kayıt + sözleşme onayı. User EDUCATOR + PENDING_EDUCATOR_APPROVAL, aktif sözleşme kabul edilir. */
export class RegisterEducatorUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly contractRepo: IContractRepository,
    private readonly acceptanceRepo: IContractAcceptanceRepository,
    private readonly auditRepo: IAuditLogRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  async execute(dto: { email: string; username: string; password: string }): Promise<{ user: UserPublic; token: string }> {
    const passwordHash = await this.passwordService.hash(dto.password);

    const user: User = {
      id: randomUUID(),
      email: dto.email.toLowerCase(),
      username: dto.username,
      passwordHash,
      role: 'EDUCATOR',
      status: 'PENDING_EDUCATOR_APPROVAL',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const saved = await this.userRepo.save(user);

    const contract = await this.contractRepo.getActiveByType('EDUCATOR');
    if (!contract || !contract.isActive) {
      throw new AppError('CONTRACT_NOT_AVAILABLE', 'Active educator contract not found', 400);
    }

    const existingAcceptance = await this.acceptanceRepo.findByUserAndContract(saved.id, contract.id);
    if (!existingAcceptance) {
      await this.acceptanceRepo.create({
        userId: saved.id,
        contractId: contract.id,
      });
      try {
        await this.auditRepo.create({
          action: 'CONTRACT_ACCEPTED',
          entityType: 'CONTRACT',
          entityId: contract.id,
          actorId: saved.id,
          metadata: { type: 'EDUCATOR' },
        });
      } catch {
        /* best-effort */
      }
    }

    const token = this.jwtService.sign({ sub: saved.id, email: saved.email, role: saved.role });
    return { user: this.toPublic(saved), token };
  }

  private toPublic(user: User): UserPublic {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    };
  }
}
