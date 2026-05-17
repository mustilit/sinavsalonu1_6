export class HomeRecommendedResponseDto {
  items!: Array<{ id: string; title?: string; examTypeId?: string }>;
  meta?: { nextCursor?: string };
}

