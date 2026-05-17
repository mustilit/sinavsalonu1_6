import { Controller, Post, Body, Put, Param, Get, Req, Patch } from '@nestjs/common';
import { Roles } from '../decorators/roles.decorator';
import { Public } from '../decorators/public.decorator';
import { CreateTestUseCase } from '../../application/use-cases/CreateTestUseCase';
import { CreateQuestionUseCase } from '../../application/use-cases/CreateQuestionUseCase';
import { ListMarketplaceTestsUseCase } from '../../application/use-cases/ListMarketplaceTestsUseCase';
import { GetTestUseCase } from '../../application/use-cases/GetTestUseCase';
import { PublishTestUseCase } from '../../application/use-cases/PublishTestUseCase';
import { UnpublishTestUseCase } from '../../application/use-cases/UnpublishTestUseCase';
import { UpdateTestUseCase } from '../../application/use-cases/UpdateTestUseCase';
import { UpdateQuestionUseCase } from '../../application/use-cases/UpdateQuestionUseCase';
import { UpdateOptionUseCase } from '../../application/use-cases/UpdateOptionUseCase';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { UpdateOptionDto } from './dto/update-option.dto';

@Controller()
export class TestsController {
  constructor(
    private readonly createTestUC: CreateTestUseCase,
    private readonly createQuestionUC: CreateQuestionUseCase,
    private readonly listUC: ListMarketplaceTestsUseCase,
    private readonly getUC: GetTestUseCase,
    private readonly publishUC: PublishTestUseCase,
    private readonly unpublishUC: UnpublishTestUseCase,
    private readonly updateTestUC: UpdateTestUseCase,
    private readonly updateQuestionUC: UpdateQuestionUseCase,
    private readonly updateOptionUC: UpdateOptionUseCase,
  ) {}

  @Post('tests')
  @Roles('EDUCATOR')
  createTest(@Body() body: CreateTestDto, @Req() req: any) {
    const educatorId = (req as any).user?.id ?? undefined;
    return this.createTestUC.execute({
      title: body.title,
      isTimed: body.isTimed,
      duration: body.duration,
      price: body.price,
      educatorId,
      examTypeId: body.examTypeId ?? null,
      topicId: body.topicId ?? null,
      questions: body.questions,
    });
  }

  @Put('tests/:id/publish')
  @Roles('EDUCATOR')
  async publish(@Param('id') id: string, @Req() req: any) {
    const actorId = (req as any).user?.id;
    return await this.publishUC.execute(id, actorId);
  }

  @Put('tests/:id/unpublish')
  @Roles('EDUCATOR')
  async unpublish(@Param('id') id: string) {
    return await this.unpublishUC.execute(id);
  }

  @Post('tests/:id/questions')
  @Roles('EDUCATOR')
  addQuestion(@Param('id') id: string, @Body() body: any) {
    return this.createQuestionUC.execute(id, body);
  }

  @Patch('tests/:id')
  @Roles('EDUCATOR')
  async updateTest(@Param('id') id: string, @Body() body: UpdateTestDto, @Req() req: any) {
    const actorId = (req as any).user?.id;
    return await this.updateTestUC.execute(id, {
      title: body.title,
      priceCents: body.priceCents,
      duration: body.duration,
      isTimed: body.isTimed,
      campaignPriceCents: body.campaignPriceCents,
      campaignValidFrom: body.campaignValidFrom ? new Date(body.campaignValidFrom) : undefined,
      campaignValidUntil: body.campaignValidUntil ? new Date(body.campaignValidUntil) : undefined,
    }, actorId);
  }

  @Patch('tests/:id/questions/:questionId')
  @Roles('EDUCATOR')
  async updateQuestion(
    @Param('id') _id: string,
    @Param('questionId') questionId: string,
    @Body() body: UpdateQuestionDto,
    @Req() req: any,
  ) {
    const actorId = (req as any).user?.id;
    return await this.updateQuestionUC.execute(questionId, {
      content: body.content,
      order: body.order,
    }, actorId);
  }

  @Patch('tests/:id/questions/:questionId/options/:optionId')
  @Roles('EDUCATOR')
  async updateOption(
    @Param('id') _id: string,
    @Param('questionId') _questionId: string,
    @Param('optionId') optionId: string,
    @Body() body: UpdateOptionDto,
    @Req() req: any,
  ) {
    const actorId = (req as any).user?.id;
    return await this.updateOptionUC.execute(optionId, {
      content: body.content,
      isCorrect: body.isCorrect,
    }, actorId);
  }

  @Public()
  @Get('marketplace/tests')
  list() {
    return this.listUC.execute();
  }

  @Public()
  @Get('tests/:id')
  get(@Param('id') id: string) {
    return this.getUC.execute(id);
  }
}

