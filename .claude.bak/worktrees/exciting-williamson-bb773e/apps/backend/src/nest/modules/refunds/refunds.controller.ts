import { Controller, Post, Body, Req, Patch, Param, HttpException, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../swagger/decorators';
import { RefundsResponseDto } from './dto/refunds.response.dto';
import { RequestRefundDto } from './dto/request-refund.dto';
import { Roles } from '../../decorators/roles.decorator';
import { RequestRefundUseCase } from '../../../application/use-cases/RequestRefundUseCase';
import { ResolveRefundRequestUseCase } from '../../../application/use-cases/ResolveRefundRequestUseCase';
import { PrismaRefundRepository } from '../../../infrastructure/repositories/PrismaRefundRepository';
import { PrismaPurchaseRepository } from '../../../infrastructure/repositories/PrismaPurchaseRepository';
import { PrismaAttemptRepository } from '../../../infrastructure/repositories/PrismaAttemptRepository';
import { PrismaAuditLogRepository } from '../../../infrastructure/repositories/PrismaAuditLogRepository';
import { Request } from 'express';
import { QueueService } from '../../../infrastructure/queue/queue.service';

@Controller('refunds')
@ApiTags('Refunds')
export class RefundsController {
  private requestRefundUc: RequestRefundUseCase;
  private resolveUc: ResolveRefundRequestUseCase;
  constructor() {
    const refundRepo = new PrismaRefundRepository();
    const purchaseRepo = new PrismaPurchaseRepository();
    const attemptRepo = new PrismaAttemptRepository();
    const auditRepo = new PrismaAuditLogRepository();
    const queueService = new QueueService();
    this.requestRefundUc = new RequestRefundUseCase(refundRepo, purchaseRepo, attemptRepo, auditRepo);
    this.resolveUc = new ResolveRefundRequestUseCase(refundRepo, auditRepo, queueService);
  }

  @Post()
  @Roles('CANDIDATE')
  @Throttle({ default: { limit: 3, ttl: 300000 } })
  @ApiBearerAuth('bearer')
  @ApiCreatedResponse({ type: RefundsResponseDto })
  @ApiErrorResponses()
  async create(@Body() body: RequestRefundDto, @Req() req: Request) {
    const actorId = (req as any).user?.id;
    return this.requestRefundUc.execute({ purchaseId: body.purchaseId, reason: body.reason }, actorId);
  }

  @Patch('admin/:id')
  @Roles('ADMIN')
  @ApiBearerAuth('bearer')
  @ApiOkResponse({ type: RefundsResponseDto })
  @ApiErrorResponses()
  async resolve(@Param('id') id: string, @Body() body: { decision: 'APPROVED' | 'REJECTED' }, @Req() req: Request) {
    const adminId = (req as any).user?.id;
    if (!adminId) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    return await this.resolveUc.execute(id, body.decision, adminId);
  }
}

