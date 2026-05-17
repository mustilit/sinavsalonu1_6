import { INotificationPreferenceRepository } from '../../domain/interfaces/INotificationPreferenceRepository';

export class UpdateNotificationPreferencesUseCase {
  constructor(private readonly repo: INotificationPreferenceRepository) {}

  async execute(userId: string, fields: Partial<{ emailEnabled: boolean; weeklyDigestEnabled: boolean; inactiveReminderEnabled: boolean }>) {
    return this.repo.updateByUserId(userId, fields);
  }
}

