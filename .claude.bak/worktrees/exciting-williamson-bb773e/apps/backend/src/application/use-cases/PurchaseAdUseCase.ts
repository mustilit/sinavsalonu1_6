import { prisma } from '../../infrastructure/database/prisma';
import { BadRequestException } from '@nestjs/common';
import { AppError } from '../errors/AppError';
import { ensureEducatorActive } from '../policies/ensureEducatorActive';
import type { IUserRepository } from '../../domain/interfaces/IUserRepository';
import { getDefaultTenantId } from '../../common/tenant';

/** FR-E-07: Eğitici reklam satın alır */
export class PurchaseAdUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(educatorId: string, adPackageId: string, testId: string) {
    const user = await this.userRepo.findById(educatorId);
    if (!user) throw new AppError('USER_NOT_FOUND', 'User not found', 404);
    ensureEducatorActive(user);

    const [adPackage, test] = await Promise.all([
      prisma.adPackage.findUnique({ where: { id: adPackageId } }),
      prisma.examTest.findUnique({ where: { id: testId } }),
    ]);

    if (!adPackage) throw new BadRequestException({ code: 'AD_PACKAGE_NOT_FOUND', message: 'Ad package not found' });
    if (!adPackage.active) throw new BadRequestException({ code: 'AD_PACKAGE_INACTIVE', message: 'Ad package is not active' });
    if (!test) throw new BadRequestException({ code: 'TEST_NOT_FOUND', message: 'Test not found' });
    if (test.educatorId !== educatorId) {
      throw new AppError('FORBIDDEN_NOT_OWNER', 'Only the educator who owns the test can purchase ads for it', 403);
    }
    if ((test as any).status !== 'PUBLISHED') {
      throw new BadRequestException({ code: 'TEST_NOT_PUBLISHED', message: 'Test must be published to purchase ads' });
    }

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + adPackage.durationDays);

    const tenantId = (test as any).tenantId ?? getDefaultTenantId();

    const purchase = await prisma.adPurchase.create({
      data: {
        tenantId,
        educatorId,
        adPackageId,
        testId,
        validUntil,
        impressionsRemaining: adPackage.impressions,
      },
    });

    return {
      id: purchase.id,
      adPackageId,
      testId,
      validUntil: purchase.validUntil,
      impressionsRemaining: purchase.impressionsRemaining,
      createdAt: purchase.createdAt,
    };
  }
}
