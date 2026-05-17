import { prisma } from '../../infrastructure/database/prisma';

export class ReviewAggregationService {
  async getAggregatesForTestIds(testIds: string[]) {
    if (!testIds || testIds.length === 0) return {};
    const rows: any[] = await prisma.review.groupBy({
      by: ['testId'],
      where: { testId: { in: testIds } },
      _avg: { testRating: true },
      _count: { _all: true },
    } as any);
    const map: Record<string, { avg: number | null; count: number }> = {};
    for (const r of rows) {
      map[r.testId] = { avg: r._avg.testRating ?? null, count: r._count._all ?? 0 };
    }
    return map;
  }
}

