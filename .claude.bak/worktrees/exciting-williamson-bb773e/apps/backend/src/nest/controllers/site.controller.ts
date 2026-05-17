import { Controller, Get, Query, Inject } from '@nestjs/common';
import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { Public } from '../decorators/public.decorator';
import { GetSiteSettingsUseCase } from '../../application/use-cases/GetSiteSettingsUseCase';
import { ListExamTypesUseCase } from '../../application/use-cases/ListExamTypesUseCase';
import { ListFeaturedEducatorsUseCase } from '../../application/use-cases/ListFeaturedEducatorsUseCase';
import type { PrismaClient } from '@prisma/client';

@Controller('site')
@ApiTags('Site')
export class SiteController {
  constructor(
    @Inject('PRISMA') private readonly prisma: PrismaClient,
    private readonly getSiteSettings: GetSiteSettingsUseCase,
    private readonly listExamTypes: ListExamTypesUseCase,
    private readonly listFeaturedEducators: ListFeaturedEducatorsUseCase,
  ) {}

  @Get('settings')
  @Public()
  @ApiOkResponse({ description: 'Site settings for homepage and footer' })
  async getSettings() {
    return this.getSiteSettings.execute(this.prisma);
  }

  @Get('exam-types')
  @Public()
  @ApiOkResponse({ description: 'Active exam types for homepage' })
  async getExamTypes() {
    return this.listExamTypes.execute(true);
  }

  @Get('featured-educators')
  @Public()
  @ApiOkResponse({ description: 'Featured educators for homepage' })
  async getFeaturedEducators(@Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 6;
    return this.listFeaturedEducators.execute(this.prisma, isNaN(n) ? 6 : n);
  }
}
