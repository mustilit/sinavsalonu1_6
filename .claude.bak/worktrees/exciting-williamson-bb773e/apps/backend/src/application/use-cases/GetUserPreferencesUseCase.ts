import { AppError } from '../errors/AppError';
import type { IUserPreferenceRepository } from '../../domain/interfaces/IUserPreferenceRepository';

export class GetUserPreferencesUseCase {
  constructor(private readonly repo: IUserPreferenceRepository) {}

  async execute(userId: string | undefined): Promise<Record<string, unknown>> {
    if (!userId) throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
    const pref = await this.repo.findByUserId(userId);
    return pref?.preferences ?? {};
  }
}
