import { INotificationPreferenceRepository } from '../../domain/interfaces/INotificationPreferenceRepository';

export class EnsureNotificationPreferenceUseCase {
  constructor(private readonly repo: INotificationPreferenceRepository) {}

  async execute(userId: string) {
    return this.repo.ensureForUser(userId);
  }
}

