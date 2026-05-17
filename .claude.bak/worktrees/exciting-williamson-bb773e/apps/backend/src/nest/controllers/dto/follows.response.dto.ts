export class FollowsResponseDto {
  ok!: boolean;
  follows?: Array<{ educatorId?: string; followType?: string; notificationsEnabled?: boolean }>;
}

