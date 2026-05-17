import { AppError } from '../errors/AppError';
import type { IUserRepository } from '../../domain/interfaces/IUserRepository';
import type { UserStatus } from '../../domain/types';

export class ListUsersUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(params?: {
    q?: string;
    role?: string;
    status?: UserStatus;
    limit?: number;
    offset?: number;
    sort?: 'createdAt' | '-createdAt';
  }) {
    try {
      return await this.userRepo.list(params);
    } catch (e: any) {
      throw new AppError('LIST_USERS_FAILED', e?.message || 'List users failed', 500);
    }
  }
}

