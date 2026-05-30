import { PrismaPurchaseRepository } from '../../../infrastructure/repositories/PrismaPurchaseRepository';

/**
 * Adayın bir eğitici için puanlama durumunu döner:
 *   - eligible: bu eğiticiden satın alma var mı (puanlayabilir mi)?
 *   - rating/comment: mevcut eğitici puanı (varsa) — modal prefill için.
 *
 * Frontend "Değerlendir" butonunu `eligible` ile gösterir.
 */
export class GetMyEducatorRatingUseCase {
  async execute(
    educatorId: string,
    candidateId: string,
  ): Promise<{ eligible: boolean; rating: number | null; comment: string | null }> {
    if (!educatorId || !candidateId) return { eligible: false, rating: null, comment: null };

    const { prisma } = require('../../../infrastructure/database/prisma');

    // Mevcut eğitici puanı varsa zaten uygundur (review satın alma gerektirir)
    const existing = await (prisma as any).review.findFirst({
      where: { educatorId, candidateId, educatorRating: { not: null } },
      orderBy: { updatedAt: 'desc' },
      select: { educatorRating: true, comment: true },
    });
    if (existing) {
      return { eligible: true, rating: existing.educatorRating ?? null, comment: existing.comment ?? null };
    }

    // Puan yok — satın alma kontrolü (eğiticinin paketlerinden en az bir test)
    const purchaseRepo = new PrismaPurchaseRepository();
    const pkgs = await prisma.testPackage.findMany({
      where: { educatorId },
      select: { tests: { where: { deletedAt: null }, select: { id: true } } },
    });
    for (const pkg of pkgs) {
      for (const t of pkg.tests) {
        if (await purchaseRepo.hasPurchase(t.id, candidateId)) {
          return { eligible: true, rating: null, comment: null };
        }
      }
    }
    return { eligible: false, rating: null, comment: null };
  }
}
