import { AppError } from '../errors/AppError';
import type { IUserRepository } from '../../domain/interfaces/IUserRepository';
import type { User } from '../../domain/entities/User';
import type { UserStatus } from '../../domain/types';

export type AdminUpdateUserInput = {
  role?: User['role'];
  status?: UserStatus;
  educatorApprovedAt?: Date | null;
  metadataMerge?: Record<string, unknown>;
};

export class UpdateUserByAdminUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(userId: string, input: AdminUpdateUserInput) {
    if (!userId) throw new AppError('BAD_REQUEST', 'userId is required', 400);
    const updated = await this.userRepo.updateByAdmin(userId, input);
    if (!updated) throw new AppError('NOT_FOUND', 'User not found', 404);
    return updated;
  }
}

