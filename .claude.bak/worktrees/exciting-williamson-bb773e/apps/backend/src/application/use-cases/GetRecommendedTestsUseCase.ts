import { IExamRepository } from '../../domain/interfaces/IExamRepository';
import { IFollowRepository } from '../../domain/interfaces/IFollowRepository';
import { RedisCache } from '../../infrastructure/cache/RedisCache';

type Summary = {
  id: string;
  title: string;
  educatorId?: string | null;
  examTypeId?: string | null;
  priceCents?: number | null;
  currency?: string | null;
  isTimed?: boolean;
  questionCount?: number | null;
  tags?: string[];
};

export class GetRecommendedTestsUseCase {
  private cache: RedisCache;
  constructor(private readonly examRepo: IExamRepository, private readonly followRepo: IFollowRepository) {
    this.cache = new RedisCache();
  }

  async execute(candidateId: string, limit = 20, examTypeId?: string) {
    const l = Math.min(Math.max(limit, 1), 50);
    const cacheKey = `home:rec:${candidateId}:${examTypeId ?? 'all'}:v1`;
    const cached = await this.cache.get<{ items: Summary[] }>(cacheKey);
    if (cached) {
      return { items: cached.items.slice(0, l), meta: { limit: l, followedBoosted: Math.ceil(l * 0.6), fallbackCount: Math.max(0, l - Math.ceil(l * 0.6)) } };
    }

    const educatorIds = await this.followRepo.listFollowedEducatorIds(candidateId).catch((): string[] => []);
    const examTypeIds = await this.followRepo.listFollowedExamTypeIds(candidateId).catch((): string[] => []);

    const followedLimit = Math.ceil(l * 0.6);
    const fallbackLimit = l - followedLimit;

    let followedItems: any[] = [];
    if ((educatorIds && educatorIds.length) || (examTypeIds && examTypeIds.length)) {
      followedItems = await this.examRepo.listPublishedByFollowed({ educatorIds, examTypeIds, limit: followedLimit, examTypeId });
    }
    const excludeIds = followedItems.map((t) => t.id);
    const fallbackItems = await this.examRepo.listPublishedFallback({ excludeIds, limit: fallbackLimit, examTypeId });
    const combined = [...followedItems, ...fallbackItems];
    // dedupe by id, preserving order
    const seen = new Set<string>();
    const deduped = [];
    for (const t of combined) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      deduped.push(t);
    }

    const items: Summary[] = deduped.map((t) => ({
      id: t.id,
      title: t.title,
      educatorId: t.educatorId,
      examTypeId: (t as any).examTypeId ?? null,
      priceCents: (t as any).priceCents ?? null,
      currency: (t as any).currency ?? 'TRY',
      isTimed: t.isTimed,
      questionCount: t.questionCount ?? null,
      tags: [
        ...(educatorIds && educatorIds.includes(t.educatorId ?? '') ? ['FOLLOWED_EDUCATOR'] : []),
        ...(examTypeIds && examTypeIds.includes((t as { examTypeId?: string }).examTypeId ?? '') ? ['FOLLOWED_EXAMTYPE'] : []),
        ...(followedItems.find((f: { id: string }) => f.id === t.id) ? [] : ['POPULAR']),
      ],
    }));

    await this.cache.set(cacheKey, { items }, 120);
    return { items, meta: { limit: l, followedBoosted: followedItems.length, fallbackCount: fallbackItems.length } };
  }
}

