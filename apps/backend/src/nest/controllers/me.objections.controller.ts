import { Controller, Get, Query, Req, Inject } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOkResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { Roles } from '../decorators/roles.decorator';
import { ListMyObjectionsUseCase } from '../../application/use-cases/objection/ListMyObjectionsUseCase';

/**
 * Giriş yapmış adayın kendi açtığı hata bildirimlerini listeler.
 * Sadece CANDIDATE rolüne açıktır. Aday yalnızca kendi bildirimlerini görebilir,
 * başka adayların bildirimlerine erişemez.
 */
@Controller('me')
@ApiTags('me')
export class MeObjectionsController {
  constructor(@Inject(ListMyObjectionsUseCase) private readonly listMyObjections: ListMyObjectionsUseCase) {}

  @Get('objections')
  @Roles('CANDIDATE')
  @ApiBearerAuth('bearer')
  @ApiOkResponse({ description: 'List of current candidate objections (enriched, read-only)' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async getMyObjections(@Req() req: any, @Query('status') status?: string) {
    const actorId = (req as any).user?.id;
    return this.listMyObjections.execute(actorId, { status });
  }
}
