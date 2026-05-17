import { Controller, Get, Patch, Body, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOkResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { Roles } from '../decorators/roles.decorator';
import { Inject } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { GetAdminSettingsUseCase } from '../../application/use-cases/GetAdminSettingsUseCase';
import { UpdateAdminSettingsUseCase } from '../../application/use-cases/UpdateAdminSettingsUseCase';
import { UpdateAdminSettingsDto } from './dto/update-admin-settings.dto';

@Controller('admin/settings')
@ApiTags('admin/settings')
export class AdminSettingsController {
  constructor(
    @Inject('PRISMA') private readonly prisma: PrismaClient,
    private readonly getSettings: GetAdminSettingsUseCase,
    private readonly updateSettings: UpdateAdminSettingsUseCase,
  ) {}

  @Get()
  @Roles('ADMIN')
  @ApiBearerAuth('bearer')
  @ApiOkResponse({ description: 'Admin settings' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async get() {
    return this.getSettings.execute(this.prisma);
  }

  @Patch()
  @Roles('ADMIN')
  @ApiBearerAuth('bearer')
  @ApiOkResponse({ description: 'Settings updated' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async update(@Body() dto: UpdateAdminSettingsDto) {
    return this.updateSettings.execute(this.prisma, {
      commissionPercent: dto.commissionPercent,
      vatPercent: dto.vatPercent,
      purchasesEnabled: dto.purchasesEnabled,
    });
  }
}
