import { Controller, Post, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOkResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiConflictResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { Roles } from '../decorators/roles.decorator';
import { ParseUUIDPipe } from '../pipes/parse-uuid.pipe';
import { AnswerObjectionDto } from './dto/answer-objection.dto';
import { AnswerObjectionUseCase } from '../../application/use-cases/AnswerObjectionUseCase';

@Controller('educators/me/objections')
@ApiTags('educators/me/objections')
export class EducatorObjectionsController {
  constructor(private readonly answerObjection: AnswerObjectionUseCase) {}

  @Post(':id/answer')
  @Roles('EDUCATOR')
  @ApiBearerAuth('bearer')
  @ApiOkResponse({ description: 'Objection answered' })
  @ApiBadRequestResponse({ description: 'Answer too short' })
  @ApiForbiddenResponse({ description: 'Not owner or educator not approved/suspended' })
  @ApiNotFoundResponse({ description: 'Objection not found' })
  @ApiConflictResponse({ description: 'OBJECTION_SLA_EXPIRED' })
  async answer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AnswerObjectionDto,
    @Req() req: any,
  ) {
    const actorId = (req as any).user?.id;
    return this.answerObjection.execute({ objectionId: id, answerText: body.answerText }, actorId);
  }
}
