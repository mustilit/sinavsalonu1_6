import { IsString, MinLength, IsOptional, IsBoolean, IsUUID } from 'class-validator';

export class CreateTopicDto {
  @IsUUID()
  examTypeId!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
