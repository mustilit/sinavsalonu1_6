import { Body, Controller, Get, Inject, Param, Post, Req } from '@nestjs/common';
import { Roles } from '../decorators/roles.decorator';
import type { PrismaClient } from '@prisma/client';
import { StartTestAttemptUseCase } from '../../application/use-cases/StartTestAttemptUseCase';
import { PauseTestAttemptUseCase } from '../../application/use-cases/PauseTestAttemptUseCase';
import { ResumeTestAttemptUseCase } from '../../application/use-cases/ResumeTestAttemptUseCase';
import { GetTestAttemptUseCase } from '../../application/use-cases/GetTestAttemptUseCase';
import { SubmitAnswerUseCase } from '../../application/use-cases/SubmitAnswerUseCase';
import { PrismaService } from '../modules/prisma/prisma.service';

@Controller()
export class AttemptsController {
  private readonly startUC: StartTestAttemptUseCase;
  private readonly pauseUC: PauseTestAttemptUseCase;
  private readonly resumeUC: ResumeTestAttemptUseCase;
  private readonly getUC: GetTestAttemptUseCase;
  private readonly submitAnswerUC: SubmitAnswerUseCase;

  constructor(@Inject(PrismaService) prismaService: PrismaService) {
    const prisma: PrismaClient = prismaService.client;
    this.startUC = new StartTestAttemptUseCase(prisma);
    this.pauseUC = new PauseTestAttemptUseCase(prisma);
    this.resumeUC = new ResumeTestAttemptUseCase(prisma);
    this.getUC = new GetTestAttemptUseCase(prisma);
    this.submitAnswerUC = new SubmitAnswerUseCase(prisma);
  }

  @Post('tests/:id/start')
  @Roles('CANDIDATE')
  async start(@Param('id') testId: string, @Req() req: any) {
    const userId = (req as any).user?.id;
    const tenantId = (req as any).tenant?.id;
    return this.startUC.execute(testId, userId, tenantId);
  }

  @Post('attempts/:id/pause')
  @Roles('CANDIDATE')
  async pause(@Param('id') attemptId: string, @Req() req: any) {
    const userId = (req as any).user?.id;
    return this.pauseUC.execute(attemptId, userId);
  }

  @Post('attempts/:id/resume')
  @Roles('CANDIDATE')
  async resume(@Param('id') attemptId: string, @Req() req: any) {
    const userId = (req as any).user?.id;
    return this.resumeUC.execute(attemptId, userId);
  }

  @Post('attempts/:id/answer')
  @Roles('CANDIDATE')
  async answer(
    @Param('id') attemptId: string,
    @Body() body: { questionId: string; selectedOptionId?: string | null },
    @Req() req: any,
  ) {
    const userId = (req as any).user?.id;
    return this.submitAnswerUC.execute(attemptId, body.questionId, body.selectedOptionId, userId);
  }

  @Get('attempts/:id')
  @Roles('CANDIDATE')
  async get(@Param('id') attemptId: string, @Req() req: any) {
    const userId = (req as any).user?.id;
    return this.getUC.execute(attemptId, userId);
  }
}

