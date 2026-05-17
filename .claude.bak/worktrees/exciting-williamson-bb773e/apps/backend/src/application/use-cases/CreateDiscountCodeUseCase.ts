import { BadRequestException } from '@nestjs/common';
import { prisma } from '../../infrastructure/database/prisma';
import { AppError } from '../errors/AppError';
import { ensureEducatorActive } from '../policies/ensureEducatorActive';
import type { IUserRepository } from '../../domain/interfaces/IUserRepository';
import type { IAuditLogRepository } from '../../domain/interfaces/IAuditLogRepository';

/** FR-E-09: Eğitici limitli kullanım indirim kodu oluşturur */
export class CreateDiscountCodeUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly auditRepo: IAuditLogRepository,
  ) {}

  async execute(
    educatorId: string,
    input: {
      code: string;
      percentOff: number;
      maxUses?: number | null;
      validFrom?: Date | null;
      validUntil?: Date | null;
      description?: string | null;
    },
  ) {
    const user = await this.userRepo.findById(educatorId);
    if (!user) throw new AppError('USER_NOT_FOUND', 'User not found', 404);
    ensureEducatorActive(user);

    const code = input.code.trim().toUpperCase();
    if (!code || code.length < 3) {
      throw new BadRequestException({ code: 'INVALID_CODE', message: 'Code must be at least 3 characters' });
    }
    if (input.percentOff < 1 || input.percentOff > 50) {
      throw new BadRequestException({ code: 'INVALID_PERCENT', message: 'percentOff must be between 1 and 50' });
    }
    if (input.maxUses != null && input.maxUses < 1) {
      throw new BadRequestException({ code: 'INVALID_MAX_USES', message: 'maxUses must be at least 1' });
    }
    if (input.validFrom && input.validUntil && input.validFrom >= input.validUntil) {
      throw new BadRequestException({ code: 'INVALID_DATES', message: 'validUntil must be after validFrom' });
    }

    const existing = await prisma.discountCode.findUnique({ where: { code } });
    if (existing) {
      throw new BadRequestException({ code: 'CODE_EXISTS', message: 'Discount code already exists' });
    }

    const created = await prisma.discountCode.create({
      data: {
        code,
        percentOff: input.percentOff,
        maxUses: input.maxUses ?? null,
        validFrom: input.validFrom ?? null,
        validUntil: input.validUntil ?? null,
        description: input.description ?? null,
        createdById: educatorId,
      },
    });

    try {
      await this.auditRepo.create({
        action: 'DISCOUNT_CREATED' as any,
        entityType: 'DiscountCode',
        entityId: created.id,
        actorId: educatorId,
        metadata: { code: created.code, percentOff: created.percentOff, maxUses: created.maxUses },
      });
    } catch {
      /* best-effort */
    }

    return {
      id: created.id,
      code: created.code,
      percentOff: created.percentOff,
      maxUses: created.maxUses,
      usedCount: created.usedCount,
      validFrom: created.validFrom,
      validUntil: created.validUntil,
      description: created.description,
      createdAt: created.createdAt,
    };
  }
}
