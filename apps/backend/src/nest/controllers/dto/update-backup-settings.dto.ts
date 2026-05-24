import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateBackupSettingsDto {
  @IsOptional()
  @IsBoolean()
  backupEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  backupCronExpression?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  backupTargetDir?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  backupRetentionDays?: number;
}
