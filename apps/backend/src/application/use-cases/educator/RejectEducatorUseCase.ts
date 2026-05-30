import { Injectable, Inject } from '@nestjs/common';
import { AppError } from '../../errors/AppError';
import { IUserRepository } from '../../../domain/interfaces/IUserRepository';
import { IAuditLogRepository } from '../../../domain/interfaces/IAuditLogRepository';
import { USER_REPO, AUDIT_LOG_REPO } from '../../constants';
import { prisma } from '../../../infrastructure/database/prisma';

/**
 * Admin'in bir eğitici başvurusunu **reddetmesini** sağlar.
 *
 * Reddetme akışı:
 *   - User.status → REJECTED
 *   - User.rejectionReason → admin'in girdiği açıklama
 *   - User.rejectedAt → şimdi
 *   - Audit log: EDUCATOR_REJECTED (metadata.reason)
 *
 * İdempotent: zaten REJECTED ise mevcut bilgiler döner.
 * Yalnızca EDUCATOR rolündeki kullanıcılar reddedilebilir.
 *
 * NOT: Prisma client regenerate edilmediğinden (Windows EPERM) raw SQL
 * ile update yapılır — rejectionReason/rejectedAt kolonları client'ta yok.
 */
@Injectable()
export class RejectEducatorUseCase {
  constructor(
    @Inject(USER_REPO) private readonly userRepo: IUserRepository,
    @Inject(AUDIT_LOG_REPO) private readonly auditRepo: IAuditLogRepository,
  ) {}

  async execute(
    adminActorId: string,
    educatorUserId: string,
    reason: string,
  ): Promise<{ id: string; status: string; rejectionReason: string; rejectedAt: Date }> {
    const trimmedReason = (reason ?? '').trim();
    if (!trimmedReason) {
      throw new AppError('REJECTION_REASON_REQUIRED', 'Red sebebi zorunludur', 400);
    }
    if (trimmedReason.length > 1000) {
      throw new AppError('REJECTION_REASON_TOO_LONG', 'Red sebebi en fazla 1000 karakter olabilir', 400);
    }

    const user = await this.userRepo.findById(educatorUserId);
    if (!user) throw new AppError('USER_NOT_FOUND', 'Kullanıcı bulunamadı', 404);
    if (user.role !== 'EDUCATOR') throw new AppError('USER_NOT_EDUCATOR', 'Kullanıcı eğitici değil', 409);

    // İdempotent: zaten REJECTED ise mevcut bilgiler dön
    const existing = await prisma.$queryRaw<Array<{ status: string; rejectionReason: string | null; rejectedAt: Date | null }>>`
      SELECT status::text AS status, "rejectionReason", "rejectedAt"
      FROM users WHERE id = ${educatorUserId} LIMIT 1
    `;
    if (existing[0]?.status === 'REJECTED' && existing[0].rejectedAt) {
      return {
        id: educatorUserId,
        status: 'REJECTED',
        rejectionReason: existing[0].rejectionReason ?? '',
        rejectedAt: existing[0].rejectedAt,
      };
    }

    const now = new Date();
    // Raw SQL — Prisma client regenerate edilmedi (REJECTED enum + yeni kolonlar)
    await prisma.$executeRaw`
      UPDATE users
      SET status = 'REJECTED'::"UserStatus",
          "rejectionReason" = ${trimmedReason},
          "rejectedAt" = ${now},
          "updatedAt" = ${now}
      WHERE id = ${educatorUserId}
    `;

    try {
      await this.auditRepo.create({
        action: 'EDUCATOR_REJECTED' as any,
        entityType: 'USER',
        entityId: educatorUserId,
        actorId: adminActorId,
        metadata: { reason: trimmedReason } as any,
      });
    } catch {
      // best-effort
    }

    return { id: educatorUserId, status: 'REJECTED', rejectionReason: trimmedReason, rejectedAt: now };
  }
}
