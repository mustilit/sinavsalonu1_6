import type { PrismaClient } from '@prisma/client';

export type FeaturedEducator = {
  id: string;
  username: string;
  testCount: number;
  saleCount: number;
  ratingAvg: number | null;
};

export class ListFeaturedEducatorsUseCase {
  async execute(prisma: PrismaClient, limit = 6): Promise<FeaturedEducator[]> {
    const capped = Math.min(20, Math.max(1, limit));
    const bySales = await prisma.$queryRaw<{ educator_id: string; cnt: number }[]>`
      SELECT t.educator_id AS educator_id, COUNT(p.id)::int AS cnt
      FROM purchases p
      JOIN exam_tests t ON p.test_id = t.id
      WHERE t.educator_id IS NOT NULL AND t.published_at IS NOT NULL
      GROUP BY t.educator_id
      ORDER BY cnt DESC
      LIMIT ${capped}
    `;
    const educatorIds = bySales.map((r) => r.educator_id);
    if (educatorIds.length === 0) {
      const fallback = await prisma.user.findMany({
        where: { role: 'EDUCATOR', status: 'ACTIVE' },
        take: capped,
        select: { id: true, username: true },
      });
      const testCounts = await prisma.examTest.groupBy({
        by: ['educatorId'],
        where: { educatorId: { in: fallback.map((u) => u.id) }, publishedAt: { not: null } },
        _count: { id: true },
      });
      const byEducator = Object.fromEntries(testCounts.map((t) => [t.educatorId!, t._count.id]));
      return fallback.map((u) => ({
        id: u.id,
        username: u.username,
        testCount: byEducator[u.id] ?? 0,
        saleCount: 0,
        ratingAvg: null as number | null,
      }));
    }
    const users = await prisma.user.findMany({
      where: { id: { in: educatorIds }, role: 'EDUCATOR' },
      select: { id: true, username: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    const testCounts = await prisma.examTest.groupBy({
      by: ['educatorId'],
      where: { educatorId: { in: educatorIds }, publishedAt: { not: null } },
      _count: { id: true },
    });
    const saleMap = new Map(bySales.map((r) => [r.educator_id, r.cnt]));
    const testCountMap = new Map(testCounts.map((t) => [t.educatorId!, t._count.id]));
    const ratingRows = await prisma.review.groupBy({
      by: ['educatorId'],
      where: { educatorId: { in: educatorIds }, educatorRating: { not: null } },
      _avg: { educatorRating: true },
      _count: { id: true },
    });
    const ratingMap = new Map(ratingRows.map((r) => [r.educatorId, r._avg.educatorRating ?? null]));
    return educatorIds
      .filter((id) => userMap.has(id))
      .map((id) => ({
        id,
        username: userMap.get(id)!.username,
        testCount: testCountMap.get(id) ?? 0,
        saleCount: saleMap.get(id) ?? 0,
        ratingAvg: ratingMap.get(id) ?? null,
      }));
  }
}
