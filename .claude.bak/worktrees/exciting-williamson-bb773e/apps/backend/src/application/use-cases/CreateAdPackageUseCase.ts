import { prisma } from '../../infrastructure/database/prisma';
import { BadRequestException } from '@nestjs/common';

/** FR-Y-09: Admin reklam paketi oluşturur */
export class CreateAdPackageUseCase {
  async execute(input: {
    name: string;
    durationDays: number;
    impressions: number;
    priceCents: number;
    currency?: string;
    active?: boolean;
  }) {
    if (input.durationDays < 1 || input.impressions < 1 || input.priceCents < 0) {
      throw new BadRequestException({ code: 'INVALID_INPUT', message: 'durationDays, impressions must be >= 1, priceCents >= 0' });
    }
    return prisma.adPackage.create({
      data: {
        name: input.name,
        durationDays: input.durationDays,
        impressions: input.impressions,
        priceCents: input.priceCents,
        currency: input.currency ?? 'TRY',
        active: input.active ?? true,
      },
    });
  }
}
