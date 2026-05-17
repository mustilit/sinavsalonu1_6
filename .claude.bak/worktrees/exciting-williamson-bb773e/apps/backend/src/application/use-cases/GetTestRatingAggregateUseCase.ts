import { IReviewRepository } from '../../domain/interfaces/IReviewRepository';

export class GetTestRatingAggregateUseCase {
  constructor(private readonly reviewRepo: IReviewRepository) {}
  async execute(testId: string) {
    return this.reviewRepo.getAggregateForTest(testId);
  }
}

