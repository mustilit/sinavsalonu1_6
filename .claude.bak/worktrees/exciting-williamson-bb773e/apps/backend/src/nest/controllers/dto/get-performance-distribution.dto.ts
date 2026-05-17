import { IsOptional, IsString } from 'class-validator';

export class GetPerformanceDistributionDto {
  @IsOptional()
  @IsString()
  attemptId?: string;
}

