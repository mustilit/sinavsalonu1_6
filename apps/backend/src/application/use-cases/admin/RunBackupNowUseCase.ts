import { Injectable } from '@nestjs/common';
import { BackupSchedulerService } from '../../../nest/services/BackupSchedulerService';
import { AppError } from '../../errors/AppError';

@Injectable()
export class RunBackupNowUseCase {
  constructor(private readonly scheduler: BackupSchedulerService) {}

  async execute(actorId: string) {
    const result = await this.scheduler.runNow(actorId);
    if (!result.success) {
      throw new AppError('BACKUP_FAILED', result.error || 'Yedekleme başarısız', 500);
    }
    return { logId: result.logId };
  }
}
