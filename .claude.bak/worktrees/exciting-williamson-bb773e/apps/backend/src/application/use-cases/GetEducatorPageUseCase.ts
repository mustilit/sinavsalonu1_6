import { ReviewAggregationService } from '../services/ReviewAggregationService';

export class GetEducatorPageUseCase {
  constructor(private readonly usersRepo: any, private readonly examsRepo: any, private readonly statsRepo: any, private readonly reviewAgg: any = new ReviewAggregationService()) {}

  async execute(educatorId: string, opts?: { page?: number; limit?: number; examTypeId?: string; sortBy?: string; sortDir?: string }) {
    if (!educatorId) throw new Error('INVALID_INPUT');
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.min(50, Math.max(1, opts?.limit ?? 20));

    const educator = await this.usersRepo.findEducatorById(educatorId);
    if (!educator || educator.role !== 'EDUCATOR') throw new Error('EDUCATOR_NOT_FOUND');

    const { items: tests, total } = await this.examsRepo.listPublishedByEducator({ educatorId, examTypeId: opts?.examTypeId, page, limit, sortBy: opts?.sortBy === 'PRICE' ? 'price' : opts?.sortBy === 'NEWEST' ? 'publishedAt' : 'publishedAt', order: opts?.sortDir ?? 'desc' });

    const testIds = tests.map((t: { id: string }) => t.id);
    const statsRows = await this.statsRepo.findManyByTestIds(testIds);
    const statsMap: Record<string, { ratingAvg?: number; ratingCount?: number; testId?: string }> = {};
    for (const s of statsRows) statsMap[s.testId] = s;

    let eduAgg: Record<string, { avg?: number; count?: number }> = {};
    const missingIds = testIds.filter((id: string) => !statsMap[id]);
    if (missingIds.length) {
      eduAgg = await this.reviewAgg.getAggregatesForTestIds(testIds);
    }

    const ratingData: { ratingAvg: number | null; ratingCount: number } = { ratingAvg: null, ratingCount: 0 };
    // compute educator aggregates from reviews
    {
      let sum = 0;
      let cnt = 0;
      for (const tid of testIds) {
        const r = (eduAgg as any)[tid];
        if (r && r.count) {
          sum += (r.avg ?? 0) * r.count;
          cnt += r.count;
        }
      }
      ratingData.ratingAvg = cnt ? sum / cnt : null;
      ratingData.ratingCount = cnt;
    }

    const items = tests.map((t: any) => ({
      id: t.id,
      title: t.title,
      educatorId: t.educatorId,
      examTypeId: t.examTypeId ?? null,
      priceCents: t.priceCents ?? null,
      currency: t.currency ?? 'TRY',
      isTimed: t.isTimed,
      questionCount: t.questionCount ?? 0,
      ratingAvg: statsMap[t.id]?.ratingAvg ?? (eduAgg as any)[t.id]?.avg ?? null,
      ratingCount: statsMap[t.id]?.ratingCount ?? (eduAgg as any)[t.id]?.count ?? 0,
    }));

    return {
      educator: { id: educator.id, displayName: educator.username, bio: educator.bio ?? null, avatarUrl: null, isApproved: educator.status === 'ACTIVE' },
      stats: { ratingAvg: ratingData.ratingAvg, ratingCount: ratingData.ratingCount, totalPublishedTests: total, totalPurchases: null },
      tests: { items, meta: { page, limit, total } },
    };
  }
}

