export class ListReviewsResponseDto {
  items!: Array<{
    id: string;
    testRating: number;
    educatorRating?: number;
    comment?: string;
    createdAt: string;
  }>;
  meta?: { nextCursor?: string };
}

