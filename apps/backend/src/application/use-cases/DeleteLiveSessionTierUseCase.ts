import { prisma } from '../../infrastructure/database/prisma';

export class DeleteLiveSessionTierUseCase {
  async execute(id: string) {
    const tier = await prisma.liveSessionTier.findUnique({
      where: { id },
      include: { sessions: { take: 1 } },
    });
    if (!tier) {
      throw Object.assign(new Error('Tier bulunamadi'), { status: 404 });
    }
    if (tier.sessions.length > 0) {
      throw Object.assign(
        new Error('Bu tiere ait oturumlar var, silinemez'),
        { status: 400 },
      );
    }
    await prisma.liveSessionTier.delete({ where: { id } });
    return { success: true };
  }
}
