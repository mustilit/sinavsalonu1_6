import { Controller, Post, Body, Req, Delete, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { ApiErrorResponses } from '../swagger/decorators';
import { FollowsResponseDto } from './dto/follows.response.dto';
import { Roles } from '../decorators/roles.decorator';
import { FollowUseCase } from '../../application/use-cases/FollowUseCase';
import { UnfollowUseCase } from '../../application/use-cases/UnfollowUseCase';
import { PrismaFollowRepository } from '../../infrastructure/repositories/PrismaFollowRepository';
import { PrismaAuditLogRepository } from '../../infrastructure/repositories/PrismaAuditLogRepository';
import { Request } from 'express';

@Controller('follows')
@ApiTags('Follows')
export class FollowsController {
  private followUc: FollowUseCase;
  private unfollowUc: UnfollowUseCase;
  constructor() {
    const repo = new PrismaFollowRepository();
    const audit = new PrismaAuditLogRepository();
    this.followUc = new FollowUseCase(repo, audit);
    this.unfollowUc = new UnfollowUseCase(repo, audit);
  }

  @Post()
  @Roles('CANDIDATE')
  @ApiBearerAuth('bearer')
  @ApiOkResponse({ type: FollowsResponseDto })
  @ApiErrorResponses()
  async follow(@Body() body: any, @Req() req: Request) {
    const followerId = (req as any).user?.id;
    await this.followUc.execute({ followerId, followType: body.followType, educatorId: body.educatorId, examTypeId: body.examTypeId, notificationsEnabled: body.notificationsEnabled });
    return { ok: true };
  }

  @Delete()
  @Roles('CANDIDATE')
  @ApiBearerAuth('bearer')
  @ApiOkResponse({ type: FollowsResponseDto })
  @ApiErrorResponses()
  async unfollow(@Body() body: any, @Req() req: Request) {
    const followerId = (req as any).user?.id;
    await this.unfollowUc.execute({ followerId, followType: body.followType, educatorId: body.educatorId, examTypeId: body.examTypeId });
    return { ok: true };
  }

  @Get()
  @Roles('CANDIDATE')
  @ApiBearerAuth('bearer')
  @ApiOkResponse({ type: FollowsResponseDto })
  @ApiErrorResponses()
  async list(@Query('followType') followType: string, @Req() req: Request) {
    const followerId = (req as any).user?.id;
    const repo = new PrismaFollowRepository();
    return repo.listFollowsByFollower(followerId, followType as any);
  }
}

