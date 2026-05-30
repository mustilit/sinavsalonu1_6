import { IsInt, Min, Max, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Aday eğiticiyi puanlarken gönderilen gövde.
 * rating zorunlu (1-5); comment opsiyonel.
 */
export class RateEducatorDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
