import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOkResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { Roles } from '../decorators/roles.decorator';
import { ListObjectionsQueryDto } from './dto/list-objections-query.dto';
import { ListEscalatedObjectionsUseCase } from '../../application/use-cases/ListEscalatedObjectionsUseCase';

@Controller('admin/objections')
@ApiTags('admin/objections')
export class AdminObjectionsController {
  constructor(private readonly listEscalated: ListEscalatedObjectionsUseCase) {}

  @Get()
  @Roles('ADMIN')
  @ApiBearerAuth('bearer')
  @ApiOkResponse({ description: 'List objections (filter by status=ESCALATED)' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async list(@Query() q: ListObjectionsQueryDto) {
    const filters: { from?: Date; to?: Date } = {};
    if (q.from) filters.from = new Date(q.from);
    if (q.to) filters.to = new Date(q.to);
    return this.listEscalated.execute(filters);
  }
}
