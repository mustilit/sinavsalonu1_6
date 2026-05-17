import { prisma } from '../../infrastructure/database/prisma';
import { AppError } from '../errors/AppError';
import { ensureEducatorActive } from '../policies/ensureEducatorActive';
import type { IUserRepository } from '../../domain/interfaces/IUserRepository';

/** FR-E-09: Eğitici kendi indirim kodlarını listeler */
export class ListEducatorDiscountCodesUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(educatorId: string) {
    const user = await this.userRepo.findById(educatorId);
    if (!user) throw new AppError('USER_NOT_FOUND', 'User not found', 404);
    ensureEducatorActive(user);

    const items = await prisma.discountCode.findMany({
      where: { createdById: educatorId },
      orderBy: { createdAt: 'desc' },
    });

    return items.map((d) => ({
      id: d.id,
      code: d.code,
      percentOff: d.percentOff,
      maxUses: d.maxUses,
      usedCount: d.usedCount,
      validFrom: d.validFrom,
      validUntil: d.validUntil,
      description: d.description,
      createdAt: d.createdAt,
    }));
  }
}
