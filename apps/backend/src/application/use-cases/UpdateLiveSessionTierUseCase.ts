import { prisma } from '../../infrastructure/database/prisma';

interface UpdateLiveSessionTierInput {
  id: string;
  label?: string;
  minParticipants?: number;
  maxParticipants?: number | null;
  priceCents?: number;
  isActive?: boolean;
  order?: number;
}

export class UpdateLiveSessionTierUseCase {
  async execute(input: UpdateLiveSessionTierInput) {
    const { id, ...data } = input;

    const tier = await prisma.liveSessionTier.findUnique({ where: { id } });
    if (!tier) {
      throw Object.assign(new Error('Tier bulunamadi'), { status: 404 });
    }

    return prisma.liveSessionTier.update({
      where: { id },
      data,
    });
  }
}
