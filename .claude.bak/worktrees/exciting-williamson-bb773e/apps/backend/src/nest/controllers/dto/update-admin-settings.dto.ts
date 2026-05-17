import { IsOptional, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAdminSettingsDto {
  @ApiPropertyOptional({ description: 'Komisyon yüzdesi (0-100)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  commissionPercent?: number;

  @ApiPropertyOptional({ description: 'KDV yüzdesi (0-100)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  vatPercent?: number;

  @ApiPropertyOptional({ description: 'Satın alma açık/kapalı' })
  @IsOptional()
  @IsBoolean()
  purchasesEnabled?: boolean;
}
