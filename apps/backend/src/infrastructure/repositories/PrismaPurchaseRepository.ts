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
    const withRelations = await (prisma.purchase as any).findMany({
      where: { candidateId },
      orderBy: { createdAt: 'desc' },
      include: {
        test: { select: { id: true, title: true, status: true, examTypeId: true, _count: { select: { questions: true } } } },
        package: {
          select: {
            id: true,
            title: true,
            priceCents: true,
            // Paket kapsamındaki tüm ExamTest ID'leri — frontend "bu test bu paketteki mi" kontrolünde kullanır
            tests: { where: { deletedAt: null }, select: { id: true, title: true } },
          },
        },
      },
    });

    const attempts = await prisma.testAttempt.findMany({
      where: { candidateId },
      select: {
        id: true,
        testId: true,
        status: true,
        startedAt: true,
        completedAt: true,
        submittedAt: true,
        score: true,
        overtimeSeconds: true,
        metadata: true,
        answers: { select: { isCorrect: true, selectedOptionId: true } },
      },
    });
    const attemptByTest = new Map(attempts.map((a) => [a.testId, a]));

    // Tek attempt'ı zenginleştir (correct/wrong/empty count ekler)
    const enrich = (a: any) => {
      const answers: Array<{ isCorrect: boolean | null; selectedOptionId: string | null }> =
        a.answers ?? [];
      const correctCount = answers.filter((x) => x.isCorrect === true).length;
      const wrongCount = answers.filter((x) => x.isCorrect === false && x.selectedOptionId != null).length;
      const emptyCount = answers.filter((x) => !x.selectedOptionId).length;
      const { answers: _answers, ...rest } = a;
      return { ...rest, correctCount, wrongCount, emptyCount };
    };

    return (withRelations as any[]).map((p) => {
      const rawAttempt = p.testId ? (attemptByTest.get(p.testId) ?? null) : null;
      const attempt = rawAttempt ? enrich(rawAttempt) : null;

      // Paket içindeki TÜM testlerin attempt'larını ekle —
      // frontend "in progress" durumunu doğru tesste gösterebilsin
      const pkgTestIds: string[] = (p.package?.tests ?? []).map((t: any) => t.id);
      const attemptsAll = pkgTestIds
        .map((tid) => attemptByTest.get(tid))
        .filter(Boolean)
        .map((a: any) => enrich(a));

      return {
        id: p.id,
        testId: p.testId ?? null,
        packageId: p.packageId ?? null,
        candidateId: p.candidateId,
        createdAt: p.createdAt,
        amountCents: p.amountCents ?? null,
        paymentStatus: p.status ?? null,
        test: p.test ?? null,
        package: p.package ?? null,
        attempt,
        attempts: attemptsAll,
      } as any;
    });
  }
}

