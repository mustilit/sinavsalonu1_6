import { Injectable } from '@nestjs/common';
import { prisma } from '../../../infrastructure/database/prisma';

@Injectable()
export class GetBackupSettingsUseCase {
  async execute() {
    const settings = await prisma.adminSettings.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
      select: {
        backupEnabled: true,
        backupCronExpression: true,
        backupTargetDir: true,
        backupRetentionDays: true,
      },
    });
    return settings;
  }
}
