import { BadRequestException, InternalServerErrorException, ConflictException } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { RedisCache } from '../../infrastructure/cache/RedisCache';
import { prismaRetry } from '../../infrastructure/prisma/prisma-retry';
import { getDefaultTenantId } from '../../common/tenant';

export class PurchaseUseCase {
  private cache: RedisCache;
  constructor(private readonly prisma: PrismaClient) {
    this.cache = new RedisCache();
  }

  /**
   * Execute purchase: amount is never provided by client.
   * final price derived from test.priceCents and discount rules.
   */
  async execute(testId: string, candidateId: string, discountCode?: string) {
    if (!testId || !candidateId) throw new BadRequestException({ code: 'INVALID_INPUT', message: 'Missing testId or candidateId' });

    // FR-Y-05: Satın alma geçici durdurma - purchasesEnabled kontrolü
    const settings = await this.prisma.adminSettings.findFirst({ where: { id: 1 } });
    if (settings && !settings.purchasesEnabled) {
      throw new BadRequestException({ code: 'PURCHASES_DISABLED', message: 'Purchases are temporarily suspended' });
    }

    // Pre-checks: ensure test exists and is published, and candidate is ACTIVE
    const test = await this.prisma.examTest.findUnique({ where: { id: testId } });
    if (!test) throw new BadRequestException({ code: 'TEST_NOT_FOUND', message: 'Test not found' });
    if ((test as any).status && (test as any).status !== 'PUBLISHED') {
      throw new BadRequestException({ code: 'TEST_NOT_PUBLISHED', message: 'Test is not published' });
    }

    const user = await this.prisma.user.findUnique({ where: { id: candidateId } });
    if (user && (user as any).status && (user as any).status !== 'ACTIVE') {
      throw new BadRequestException({ code: 'CANDIDATE_NOT_ACTIVE', message: 'Candidate not active' });
    }

    const now = new Date();
    let baseAmountCents = (test as any).priceCents ?? 0;
    const campaignPrice = (test as any).campaignPriceCents;
    const campaignFrom = (test as any).campaignValidFrom;
    const campaignUntil = (test as any).campaignValidUntil;
    if (typeof campaignPrice === 'number' && campaignFrom && campaignUntil && now >= campaignFrom && now <= campaignUntil) {
      baseAmountCents = campaignPrice;
    }
    let finalAmountCents = baseAmountCents;
    let discountApplied: any = null;

    if (discountCode) {
      // prefer discount tied to educator or global (createdById = null)
      const disc = await this.prisma.discountCode.findFirst({
        where: {
          code: discountCode,
          OR: [{ createdById: test.educatorId }, { createdById: null }],
        },
      });
      if (!disc) throw new BadRequestException({ code: 'DISCOUNT_NOT_FOUND', message: 'Discount not found' });
      if (disc.validFrom && disc.validFrom > now) throw new BadRequestException({ code: 'DISCOUNT_NOT_STARTED', message: 'Discount not started' });
      if (disc.validUntil && disc.validUntil < now) throw new BadRequestException({ code: 'DISCOUNT_EXPIRED', message: 'Discount expired' });
      if (disc.maxUses && disc.usedCount >= disc.maxUses) throw new BadRequestException({ code: 'DISCOUNT_MAXED_OUT', message: 'Discount usage limit reached' });
      const percent = disc.percentOff ?? 0;
      if (percent > 50) throw new BadRequestException({ code: 'DISCOUNT_TOO_HIGH', message: 'Discount percent too high' });
      finalAmountCents = Math.max(0, Math.round(baseAmountCents * (100 - percent) / 100));
      discountApplied = disc;
    }

    const tenantId = (test as any).tenantId ?? getDefaultTenantId();

    try {
      const result = await prismaRetry(() =>
        this.prisma.$transaction(async (tx) => {
        const purchase = await tx.purchase.create({
          data: {
            tenantId,
            testId,
            candidateId,
            amountCents: finalAmountCents,
            currency: (test as any).currency ?? 'TRY',
            ...(discountApplied ? { discountCodeId: discountApplied.id } : {}),
          },
        });

        const attempt = await tx.testAttempt.create({
          data: { testId, candidateId, status: 'IN_PROGRESS' },
        });

        await tx.auditLog.create({
          data: {
            action: 'PURCHASE',
            entityType: 'Purchase',
            entityId: purchase.id,
            actorId: candidateId,
            metadata: { amountCents: finalAmountCents, discountCode: discountApplied ? discountApplied.code : null },
          },
        });

        // increment discount usedCount if applied - race safe via updateMany
        if (discountApplied) {
          if (discountApplied.maxUses) {
            const updated = await tx.discountCode.updateMany({
              where: { id: discountApplied.id, usedCount: { lt: discountApplied.maxUses } },
              data: { usedCount: { increment: 1 } },
            });
            if (updated.count === 0) {
              throw new BadRequestException({ code: 'DISCOUNT_MAXED_OUT', message: 'Discount usage limit reached' });
            }
          } else {
            await tx.discountCode.update({ where: { id: discountApplied.id }, data: { usedCount: { increment: 1 } } as any });
          }
        }

          return { purchase, attempt };
        }),
      );
      // invalidate purchaser's home cache (popularity may change)
      try {
        await this.cache.delByPrefix(`home:rec:${candidateId}:`);
      } catch {}
      return result;
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException({ code: 'ALREADY_PURCHASED', message: 'Candidate has already purchased this test' });
      }
      if (e instanceof BadRequestException) throw e;
      // enqueue stats refresh for test
      try {
        const { QueueService } = require('../../infrastructure/queue/queue.service');
        const qs = new QueueService();
        await qs.enqueueJob('stats-queue', 'refresh', { testId });
      } catch {}
      throw new InternalServerErrorException({ code: 'PURCHASE_FAILED', message: 'Purchase failed' });
    }
  }
}

