import { Controller, Get, Post, Patch, Delete, Body, Req, Query, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOkResponse, ApiCreatedResponse, ApiForbiddenResponse, ApiConflictResponse, ApiBadRequestResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { Roles } from '../decorators/roles.decorator';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { ListTopicsQueryDto } from './dto/list-topics.query.dto';
import { CreateTopicUseCase } from '../../application/use-cases/CreateTopicUseCase';
import { ListTopicsByExamTypeUseCase } from '../../application/use-cases/ListTopicsByExamTypeUseCase';
import { UpdateTopicUseCase } from '../../application/use-cases/UpdateTopicUseCase';
import { DeleteTopicUseCase } from '../../application/use-cases/DeleteTopicUseCase';

@Controller('admin/topics')
@ApiTags('admin/topics')
export class AdminTopicsController {
  constructor(
    private readonly listTopics: ListTopicsByExamTypeUseCase,
    private readonly createTopic: CreateTopicUseCase,
    private readonly updateTopic: UpdateTopicUseCase,
    private readonly deleteTopic: DeleteTopicUseCase,
  ) {}

  @Get()
  @Roles('ADMIN')
  @ApiBearerAuth('bearer')
  @ApiOkResponse({ description: 'List of topics for exam type' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiBadRequestResponse({ description: 'Invalid examTypeId' })
  async list(@Query() q: ListTopicsQueryDto) {
    const activeOnly = q.activeOnly === 'false' ? false : true;
    return this.listTopics.execute(q.examTypeId, activeOnly);
  }

  @Post()
  @Roles('ADMIN')
  @ApiBearerAuth('bearer')
  @ApiCreatedResponse({ description: 'Created' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiConflictResponse({ description: 'Topic slug exists for this exam type' })
  @ApiBadRequestResponse({ description: 'Invalid examTypeId' })
  @ApiNotFoundResponse({ description: 'Exam type not found' })
  async create(@Body() body: CreateTopicDto, @Req() req: any) {
    const actorId = (req as any).user?.id;
    return this.createTopic.execute(
      { examTypeId: body.examTypeId, name: body.name, slug: body.slug, active: body.active },
      actorId,
    );
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiBearerAuth('bearer')
  @ApiOkResponse({ description: 'Updated' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Not found' })
  @ApiConflictResponse({ description: 'Slug exists' })
  async update(@Param('id') id: string, @Body() body: UpdateTopicDto, @Req() req: any) {
    const actorId = (req as any).user?.id;
    return this.updateTopic.execute(id, { name: body.name, slug: body.slug, active: body.active }, actorId);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiBearerAuth('bearer')
  @ApiOkResponse({ description: 'Deleted' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Not found' })
  async delete(@Param('id') id: string, @Req() req: any) {
    const actorId = (req as any).user?.id;
    return this.deleteTopic.execute(id, actorId);
  }
}
