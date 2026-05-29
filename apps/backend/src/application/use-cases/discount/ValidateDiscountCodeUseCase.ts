import { prisma } from '../../../infrastructure/database/prisma';
import { AppError } from '../../errors/AppError';

/**
 * Sprint 15 #2 — Aday paket satın almadan önce indirim kodunu doğrular.
 *
 * Bu use case **sadece kontrol yapar** — kodun usage sayacını artırmaz. Asıl
 * uygulama `PurchaseUseCase.execute()` içinde, transaction altında yapılır
 * (race-condition korumalı `updateMany ... lt: maxUses`).
 *
 * Frontend bunu "Uygula" butonunda çağırır, başarılıysa indirim oranı + son
 * fiyatı UI'da gösterir. Submit'te aynı kodu Purchase.create body'sine koyar.
 *
 * Geri dönüş:
 *   { code, percentOff, discountCents, finalAmountCents, description }
 *
 * Hata kodları:
 *   - DISCOUNT_NOT_FOUND     : kod yok veya pasif
 *   - DISCOUNT_NOT_ACTIVE    : isActive=false
 *   - DISCOUNT_OUT_OF_WINDOW : validFrom/validUntil dışında
 *   - DISCOUNT_USAGE_EXHAUSTED : maxUses aşıldı
 *   - DISCOUNT_NOT_OWNED      : kod başka eğiticinin (paket sahibiyle eşleşmiyor)
 *
 * KAPSAM (PurchaseUseCase ile hizalı):
 *   - `createdById === null` → GLOBAL kod (admin oluşturdu): her pakette geçerli,
 *     hiçbir eğiticiye bağlı değil. "herhangi bir teste bağlanır, eğiticiye bağlanmaz".
 *   - `createdById === TestPackage.educatorId` → eğiticinin kendi paketine bağlı kodu.
 *   - aksi → DISCOUNT_NOT_OWNED (başka eğiticinin paket sahipliğini ifşa etmeden
 *     "geçersiz kod" mesajı gösterilir).
 * Admin platform promo kodları (canlı test/reklam — PlatformPromoCode) AYRI bir
 * sistemdir; bu use case'e hiç girmez (kod string'leri çapraz benzersizdir).
 */
export class ValidateDiscountCodeUseCase {
  /**
   * @param code      - Kullanıcının girdiği kod (case-insensitive — upper'a çevrilir)
   * @param packageId - Paket ID (eğitici eşleşmesi için zorunlu)
   * @param basePriceCents - Paketin baz fiyatı (indirim hesaplaması için)
   */
  async execute(input: {
    code: string;
    packageId: string;
    basePriceCents: number;
  }): Promise<{
    code: string;
    percentOff: number;
    discountCents: number;
    finalAmountCents: number;
    description: string | null;
  }> {
    const code = (input.code ?? '').trim().toUpperCase();
    if (!code || !input.packageId || input.basePriceCents == null) {
      throw new AppError('DISCOUNT_NOT_FOUND', 'Geçersiz indirim kodu', 400);
    }

    // Kod ile birlikte paketin sahibini bulmak için JOIN.
    // İndirim kodu varsa, kodun yaratıcısı (createdById) paketin sahibi olmalı.
    const pkg = await prisma.testPackage.findUnique({
      where: { id: input.packageId },
      select: { id: true, educatorId: true, publishedAt: true },
    });
    if (!pkg || !pkg.publishedAt) {
      throw new AppError('PACKAGE_NOT_FOUND', 'Paket bulunamadı', 404);
    }

    const discount = await prisma.discountCode.findUnique({
      where: { code },
      select: {
        code: true,
        description: true,
        percentOff: true,
        maxUses: true,
        usedCount: true,
        validFrom: true,
        validUntil: true,
        isActive: true,
        createdById: true,
      },
    });
    if (!discount) {
      throw new AppError('DISCOUNT_NOT_FOUND', 'İndirim kodu bulunamadı', 404);
    }
    if (!discount.isActive) {
      throw new AppError('DISCOUNT_NOT_ACTIVE', 'İndirim kodu pasif', 409);
    }
    // Sahiplik / kapsam (PurchaseUseCase ile birebir hizalı):
    //   - createdById === null            → GLOBAL kod (admin oluşturdu): her pakette geçerli.
    //   - createdById === pkg.educatorId   → eğiticinin kendi paketine bağlı kodu.
    //   - aksi (başka eğiticinin kodu)     → DISCOUNT_NOT_OWNED.
    // PurchaseUseCase eşleşmesi: OR: [{ createdById: test.educatorId }, { createdById: null }].
    if (discount.createdById !== null && discount.createdById !== pkg.educatorId) {
      throw new AppError('DISCOUNT_NOT_OWNED', 'Bu kod bu paket için geçerli değil', 409);
    }
    const now = new Date();
    if (discount.validFrom && discount.validFrom > now) {
      throw new AppError('DISCOUNT_OUT_OF_WINDOW', 'İndirim kodu henüz aktif değil', 409);
    }
    if (discount.validUntil && discount.validUntil < now) {
      throw new AppError('DISCOUNT_OUT_OF_WINDOW', 'İndirim kodunun süresi dolmuş', 409);
    }
    if (discount.maxUses != null && discount.usedCount >= discount.maxUses) {
      throw new AppError('DISCOUNT_USAGE_EXHAUSTED', 'İndirim kodu kullanım hakkı tükendi', 409);
    }

    // İndirim oranı %50 üst sınırı (PurchaseUseCase'le tutarlı)
    const effectivePercent = Math.min(Math.max(discount.percentOff, 1), 50);
    const discountCents = Math.floor((input.basePriceCents * effectivePercent) / 100);
    const finalAmountCents = Math.max(0, input.basePriceCents - discountCents);

    return {
      code: discount.code,
      percentOff: effectivePercent,
      discountCents,
      finalAmountCents,
      description: discount.description,
    };
  }
}
