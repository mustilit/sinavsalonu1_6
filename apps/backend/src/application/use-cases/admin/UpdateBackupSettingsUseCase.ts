import { Injectable } from '@nestjs/common';
import { prisma } from '../../../infrastructure/database/prisma';
import { AppError } from '../../errors/AppError';
import {
  BackupSchedulerService,
  isValidCronExpression,
} from '../../../nest/services/BackupSchedulerService';

type Input = {
  actorId: string;
  backupEnabled?: boolean;
  backupCronExpression?: string | null;
  backupTargetDir?: string | null;
  backupRetentionDays?: number;
};

@Injectable()
export class UpdateBackupSettingsUseCase {
  constructor(private readonly scheduler: BackupSchedulerService) {}

  async execute(input: Input) {
    const data: Record<string, unknown> = {};

    if (input.backupEnabled !== undefined) data.backupEnabled = input.backupEnabled;
    if (input.backupRetentionDays !== undefined) data.backupRetentionDays = input.backupRetentionDays;

    if (input.backupCronExpression !== undefined) {
      const expr = input.backupCronExpression?.trim() || null;
      if (expr && !isValidCronExpression(expr)) {
        throw new AppError(
          'INVALID_CRON',
          `Cron ifadesi geçersiz: "${expr}"`,
          400,
        );
      }
      data.backupCronExpression = expr;
    }

    if (input.backupTargetDir !== undefined) {
      const dir = input.backupTargetDir?.trim() || null;
      if (dir && !/^([a-zA-Z]:[\\/]|\/)/.test(dir)) {
        throw new AppError(
          'INVALID_BACKUP_DIR',
          'Yedek dizini mutlak yol olmalı (Linux: /var/..., Windows: C:\\...)',
          400,
        );
      }
      data.backupTargetDir = dir;
    }

    // Aktifleştirme öncesi minimum yapılandırma kontrolü
    const next = await prisma.adminSettings.upsert({
      where: { id: 1 },
      create: { id: 1, ...data },
      update: data,
      select: {
        backupEnabled: true,
        backupCronExpression: true,
        backupTargetDir: true,
        backupRetentionDays: true,
      },
    });

    if (next.backupEnabled && (!next.backupCronExpression || !next.backupTargetDir)) {
      // Tutarsız ayar: aktif ama cron veya path yok — kullanıcıya uyar, kayıt değişir ama scheduler boşa
      throw new AppError(
        'BACKUP_CONFIG_INCOMPLETE',
        'Yedekleme aktif edilemedi: cron ifadesi ve hedef dizin zorunlu',
        400,
      );
    }

    await prisma.auditLog.create({
      data: {
        action: 'ADMIN_SETTINGS_UPDATED',
        entityType: 'AdminSettings',
        entityId: '1',
        actorId: input.actorId,
        metadata: { section: 'backup', ...data },
      },
    });

    await this.scheduler.reload();
    return next;
  }
}
