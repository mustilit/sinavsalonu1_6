import { prisma } from '../database/prisma';
import { IPurchaseRepository, PurchaseRecord, PurchaseWithAttemptRecord } from '../../domain/interfaces/IPurchaseRepository';

export class PrismaPurchaseRepository implements IPurchaseRepository {
  async hasPurchase(testId: string, candidateId: string): Promise<boolean> {
    const c = await prisma.purchase.count({ where: { testId, candidateId } });
    return c > 0;
  }

  async findById(purchaseId: string): Promise<PurchaseRecord | null> {
    const row = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      select: { id: true, testId: true, candidateId: true, createdAt: true },
    });
    if (!row) return null;
    return {
      id: row.id,
      testId: row.testId,
      candidateId: row.candidateId,
      createdAt: row.createdAt,
    };
  }

  async findByCandidateId(candidateId: string): Promise<PurchaseWithAttemptRecord[]> {
    const withTest = await prisma.purchase.findMany({
      where: { candidateId },
      orderBy: { createdAt: 'desc' },
      include: {
        test: { select: { id: true, title: true, status: true, examTypeId: true } },
      },
    });
    const attempts = await prisma.testAttempt.findMany({
      where: { candidateId },
      select: { id: true, testId: true, status: true, startedAt: true, completedAt: true, score: true },
    });
    const attemptByTest = new Map(attempts.map((a) => [a.testId, a]));
    return withTest.map((p) => ({
      id: p.id,
      testId: p.testId,
      candidateId: p.candidateId,
      createdAt: p.createdAt,
      amountCents: p.amountCents,
      test: p.test,
      attempt: attemptByTest.get(p.testId) ?? null,
    }));
  }
}

