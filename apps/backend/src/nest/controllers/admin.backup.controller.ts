import { Body, Controller, Get, Inject, Patch, Post, Query, Req } from '@nestjs/common';
import { Roles } from '../decorators/roles.decorator';
import { WorkerPermissions } from '../decorators/worker-permissions.decorator';
import { GetBackupSettingsUseCase } from '../../application/use-cases/admin/GetBackupSettingsUseCase';
import { UpdateBackupSettingsUseCase } from '../../application/use-cases/admin/UpdateBackupSettingsUseCase';
import { RunBackupNowUseCase } from '../../application/use-cases/admin/RunBackupNowUseCase';
import { ListBackupLogsUseCase } from '../../application/use-cases/admin/ListBackupLogsUseCase';
import { UpdateBackupSettingsDto } from './dto/update-backup-settings.dto';
import { ListBackupLogsQueryDto } from './dto/list-backup-logs-query.dto';

@Controller('admin/backup')
export class AdminBackupController {
  constructor(
    @Inject(GetBackupSettingsUseCase) private readonly getSettingsUC: GetBackupSettingsUseCase,
    @Inject(UpdateBackupSettingsUseCase) private readonly updateSettingsUC: UpdateBackupSettingsUseCase,
    @Inject(RunBackupNowUseCase) private readonly runNowUC: RunBackupNowUseCase,
    @Inject(ListBackupLogsUseCase) private readonly listLogsUC: ListBackupLogsUseCase,
  ) {}

  @Get('settings')
  @Roles('ADMIN', 'WORKER')
  @WorkerPermissions('BackupManagement')
  async getSettings() {
    return this.getSettingsUC.execute();
  }

  @Patch('settings')
  @Roles('ADMIN', 'WORKER')
  @WorkerPermissions('BackupManagement')
  async updateSettings(@Body() dto: UpdateBackupSettingsDto, @Req() req: any) {
    return this.updateSettingsUC.execute({
      actorId: req.user?.id,
      backupEnabled: dto.backupEnabled,
      backupCronExpression: dto.backupCronExpression,
      backupTargetDir: dto.backupTargetDir,
      backupRetentionDays: dto.backupRetentionDays,
    });
  }

  @Post('run-now')
  @Roles('ADMIN', 'WORKER')
  @WorkerPermissions('BackupManagement')
  async runNow(@Req() req: any) {
    return this.runNowUC.execute(req.user?.id);
  }

  @Get('logs')
  @Roles('ADMIN', 'WORKER')
  @WorkerPermissions('BackupManagement')
  async listLogs(@Query() q: ListBackupLogsQueryDto) {
    return this.listLogsUC.execute({
      cursor: q.cursorId ? { id: q.cursorId } : undefined,
      limit: q.limit,
      status: q.status,
    });
  }
}
