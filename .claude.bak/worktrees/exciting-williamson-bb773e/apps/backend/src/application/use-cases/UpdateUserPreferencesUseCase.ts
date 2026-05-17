import { AppError } from '../errors/AppError';
import type { IUserPreferenceRepository } from '../../domain/interfaces/IUserPreferenceRepository';

const WHITELIST = [
  'theme', 'layout', 'fontSize', 'sidebarCollapsed',
  'phone', 'city', 'website', 'linkedin', 'interested_exam_types', 'notification_preferences',
  'education', 'bio', 'google_scholar_url', 'cv_url', 'profile_image_url', 'specialized_exam_types',
  'educator_status', 'rejection_reason', 'role',
];

export class UpdateUserPreferencesUseCase {
  constructor(private readonly repo: IUserPreferenceRepository) {}

  async execute(userId: string | undefined, input: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!userId) throw new AppError('UNAUTHORIZED', 'Authentication required', 401);

    const filtered: Record<string, unknown> = {};
    for (const k of Object.keys(input)) {
      if (WHITELIST.includes(k)) filtered[k] = input[k];
    }
    if (Object.keys(filtered).length === 0) {
      const existing = await this.repo.findByUserId(userId);
      return existing?.preferences ?? {};
    }

    const existing = await this.repo.findByUserId(userId);
    const merged = { ...(existing?.preferences ?? {}), ...filtered };
    const updated = await this.repo.upsert(userId, merged);
    return updated.preferences;
  }
}
