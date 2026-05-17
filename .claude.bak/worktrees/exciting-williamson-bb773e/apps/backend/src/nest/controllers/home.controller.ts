import { Controller, Get, Query, Req } from '@nestjs/common';
import { Roles } from '../decorators/roles.decorator';
import { GetRecommendedDto } from './dto/get-recommended.dto';
import { GetRecommendedTestsUseCase } from '../../application/use-cases/GetRecommendedTestsUseCase';
import { PrismaExamRepository } from '../../infrastructure/repositories/PrismaExamRepository';
import { PrismaFollowRepository } from '../../infrastructure/repositories/PrismaFollowRepository';
import { ApiTags, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { ApiErrorResponses } from '../swagger/decorators';
import { HomeRecommendedResponseDto } from './dto/home-recommended.response.dto';

@Controller('home')
@ApiTags('Home')
export class HomeController {
  private uc: GetRecommendedTestsUseCase;
  constructor() {
    this.uc = new GetRecommendedTestsUseCase(new PrismaExamRepository(), new PrismaFollowRepository());
  }

  @Get('recommended-tests')
  @Roles('CANDIDATE')
  @ApiBearerAuth('bearer')
  @ApiOkResponse({ type: HomeRecommendedResponseDto })
  @ApiErrorResponses()
  async recommended(@Query() q: GetRecommendedDto, @Req() req: any) {
    const candidateId = (req as any).user?.id;
    return this.uc.execute(candidateId, q.limit ?? 20, q.examTypeId);
  }
}

