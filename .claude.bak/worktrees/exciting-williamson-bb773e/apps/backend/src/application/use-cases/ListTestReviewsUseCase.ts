import { IReviewRepository } from '../../domain/interfaces/IReviewRepository';

export class ListTestReviewsUseCase {
  constructor(private readonly reviewRepo: IReviewRepository) {}

  async execute(testId: string, limit = 20, cursor?: string) {
    return this.reviewRepo.listReviewsForTest(testId, limit, cursor);
  }
}

