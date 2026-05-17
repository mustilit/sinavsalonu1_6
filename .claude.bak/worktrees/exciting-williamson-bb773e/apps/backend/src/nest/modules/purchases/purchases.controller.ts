import { Controller, Post, Param, Body, Req, HttpException, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PurchasesService } from './purchases.service';
import { Request } from 'express';
import { Roles } from '../../decorators/roles.decorator';

@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post(':testId')
  @Roles('CANDIDATE')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async purchase(@Param('testId') testId: string, @Body() body: any, @Req() req: Request) {
    // candidateId must come from authenticated JWT only
    const candidateId = (req as any).user?.id;
    const discountCode = body?.discountCode;
    if (!candidateId) {
      throw new HttpException('candidateId required', HttpStatus.BAD_REQUEST);
    }
    try {
      return await this.purchasesService.purchase(testId, candidateId, discountCode);
    } catch (e: any) {
      if (e?.status === 409 || e?.message === 'ALREADY_PURCHASED' || e?.response?.code === 'ALREADY_PURCHASED') {
        throw new HttpException('Already purchased', HttpStatus.CONFLICT);
      }
      throw e;
    }
  }
}

