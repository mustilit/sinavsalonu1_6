import { IsOptional, IsObject, IsString, IsUrl, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PatchEducatorProfileDto {
  @ApiPropertyOptional({ description: 'Profil metadata (bio, avatarUrl, displayName, linkedIn, website)' })
  @IsOptional()
  @IsObject()
  metadata?: {
    bio?: string;
    avatarUrl?: string;
    displayName?: string;
    linkedIn?: string;
    website?: string;
  };
}
