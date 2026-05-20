import { IObjectionRepository, EnrichedObjection } from '../../../domain/interfaces/IObjectionRepository';
import { AppError } from '../../errors/AppError';

/**
 * Adayın kendi açtığı tüm hata bildirimlerini listeler.
 * Aday yalnızca kendi açtığı bildirimleri görebilir — başka adayın bildirimlerini göremez.
 */
export class ListMyObjectionsUseCase {
  constructor(private readonly objectionRepo: IObjectionRepository) {}

  async execute(candidateId: string | undefined, filters?: { status?: string }): Promise<EnrichedObjection[]> {
    if (!candidateId) {
      throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
    }
    return this.objectionRepo.listByReporter(candidateId, filters);
  }
}
