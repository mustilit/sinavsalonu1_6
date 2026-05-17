import { IExamRepository } from '../../domain/interfaces/IExamRepository';
import { ReviewAggregationService } from '../services/ReviewAggregationService';
import { AppError } from '../errors/AppError';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SORT_VALUES = ['newest', 'priceAsc', 'priceDesc'] as const;

export type ListMarketplaceFilters = {
  examTypeId?: string;
  topicId?: string;
  educatorId?: string;
  maxPriceCents?: number;
  minRating?: number;
  sort?: (typeof SORT_VALUES)[number];
  page?: number;
  limit?: number;
};

export class ListMarketplaceTestsUseCase {
  private agg = new ReviewAggregationService();
  constructor(private readonly examRepository: IExamRepository) {}

  async execute(filters?: ListMarketplaceFilters) {
    if (filters?.examTypeId && !UUID_REGEX.test(filters.examTypeId)) {
      throw new AppError('INVALID_UUID', 'Invalid examTypeId', 400);
    }
    if (filters?.topicId && !UUID_REGEX.test(filters.topicId)) {
      throw new AppError('INVALID_UUID', 'Invalid topicId', 400);
    }
    if (filters?.educatorId && !UUID_REGEX.test(filters.educatorId)) {
      throw new AppError('INVALID_UUID', 'Invalid educatorId', 400);
    }
    if (filters?.sort && !SORT_VALUES.includes(filters.sort as any)) {
      throw new AppError('INVALID_SORT', 'sort must be one of: newest, priceAsc, priceDesc', 400);
    }

    const limit = Math.min(50, Math.max(1, filters?.limit ?? 20));
    const page = Math.max(1, filters?.page ?? 1);
    const sort = filters?.sort ?? 'newest';

    const sortBy = sort === 'newest' ? 'publishedAt' : 'priceCents';
    const order = sort === 'priceAsc' ? 'asc' : 'desc';

    const res = await this.examRepository.findPublished({
      examTypeId: filters?.examTypeId,
      topicId: filters?.topicId,
      educatorId: filters?.educatorId,
      maxPriceCents: filters?.maxPriceCents,
      minRating: filters?.minRating,
      page,
      limit,
      sortBy,
      order,
    });

    const items = res.items;
    const ids = items.map((t) => t.id);
    const aggs = await this.agg.getAggregatesForTestIds(ids);
    const enriched = items.map((t) => ({
      ...t,
      ratingAvg: aggs[t.id]?.avg ?? null,
      ratingCount: aggs[t.id]?.count ?? 0,
    }));

    const summaries = enriched.map((t: any) => ({
      id: t.id,
      title: t.title,
      educatorId: t.educatorId,
      examTypeId: t.examTypeId ?? null,
      topicId: t.topicId ?? null,
      priceCents: t.priceCents ?? null,
      currency: t.currency ?? 'TRY',
      isTimed: t.isTimed,
      questionCount: t.questionCount ?? 0,
      ratingAvg: t.ratingAvg ?? null,
      ratingCount: t.ratingCount ?? 0,
    }));

    return { items: summaries, meta: { total: res.total, page, limit } };
  }
}
