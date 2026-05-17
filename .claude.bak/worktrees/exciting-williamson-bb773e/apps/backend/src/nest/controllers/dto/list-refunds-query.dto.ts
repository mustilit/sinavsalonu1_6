import { IsOptional, IsIn } from 'class-validator';

export class ListRefundsQueryDto {
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'], { message: 'status must be PENDING, APPROVED, or REJECTED' })
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING';
}
