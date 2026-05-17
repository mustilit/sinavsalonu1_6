import { IsOptional, IsString, MinLength } from 'class-validator';

export class RejectRefundDto {
  @IsOptional()
  @IsString()
  @MinLength(5, { message: 'Reason must be at least 5 characters when provided' })
  reason?: string;
}
