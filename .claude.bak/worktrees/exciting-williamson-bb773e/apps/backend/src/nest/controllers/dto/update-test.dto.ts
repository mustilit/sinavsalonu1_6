import { IsString, IsOptional, IsBoolean, IsNumber, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Price in cents (e.g. 1999 = 19.99 TRY)' })
  @IsOptional()
  @IsNumber()
  priceCents?: number;

  @ApiPropertyOptional({ description: 'FR-E-04: Campaign price in cents' })
  @IsOptional()
  @IsNumber()
  campaignPriceCents?: number;

  @ApiPropertyOptional({ description: 'Campaign valid from (ISO date)' })
  @IsOptional()
  @IsDateString()
  campaignValidFrom?: string;

  @ApiPropertyOptional({ description: 'Campaign valid until (ISO date)' })
  @IsOptional()
  @IsDateString()
  campaignValidUntil?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isTimed?: boolean;
}
