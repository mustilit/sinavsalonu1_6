import { Module } from '@nestjs/common';
// Not: Eski `attempts.controller.ts` (modules/attempts/) silindi.
// Kanonik controller: `controllers/attempts.controller.ts` (app.module'a doğrudan
// kayıtlı). Bu modül sadece diğer modüllerin tüketebileceği use-case provider'larını
// sağlar.
import { SubmitAnswerUseCase } from '../../../application/use-cases/attempt/SubmitAnswerUseCase';
import { SubmitAttemptUseCase } from '../../../application/use-cases/attempt/SubmitAttemptUseCase';
import { GetQuestionSolutionUseCase } from '../../../application/use-cases/question/GetQuestionSolutionUseCase';
import { PrismaAttemptRepository } from '../../../infrastructure/repositories/PrismaAttemptRepository';
import { PrismaExamRepository } from '../../../infrastructure/repositories/PrismaExamRepository';
import { GetAttemptStateUseCase } from '../../../application/use-cases/attempt/GetAttemptStateUseCase';
import { PrismaAttemptAnswerRepository } from '../../../infrastructure/repositories/PrismaAttemptAnswerRepository';
import { PrismaAuditLogRepository } from '../../../infrastructure/repositories/PrismaAuditLogRepository';
import { TimeoutAttemptUseCase } from '../../../application/use-cases/attempt/TimeoutAttemptUseCase';
import { GetAttemptResultUseCase } from '../../../application/use-cases/attempt/GetAttemptResultUseCase';
import { PrismaExamRepository as PrismaExamRepo } from '../../../infrastructure/repositories/PrismaExamRepository';

@Module({
  providers: [
    {
      provide: SubmitAnswerUseCase,
      useFactory: (prisma) => new SubmitAnswerUseCase(prisma),
      inject: ['PRISMA'],
    },
    {
      provide: SubmitAttemptUseCase,
      useFactory: (prisma) => new SubmitAttemptUseCase(prisma),
      inject: ['PRISMA'],
    },
    {
      provide: GetQuestionSolutionUseCase,
      useFactory: () => new GetQuestionSolutionUseCase(new PrismaAttemptRepository(), new PrismaExamRepository()),
    },
    {
      provide: GetAttemptStateUseCase,
      useFactory: () => new GetAttemptStateUseCase(new PrismaAttemptRepository(), new PrismaExamRepository(), new PrismaAttemptAnswerRepository()),
    },
    {
      provide: GetAttemptResultUseCase,
      useFactory: () => new GetAttemptResultUseCase(new PrismaAttemptRepository(), new PrismaExamRepository(), new PrismaAttemptAnswerRepository()),
    },
    {
      provide: TimeoutAttemptUseCase,
      useFactory: () => new TimeoutAttemptUseCase(new PrismaAttemptRepository(), new PrismaExamRepository(), new PrismaAttemptAnswerRepository(), new PrismaAuditLogRepository()),
    },
    {
      provide: 'TIMEOUT_USECASE',
      useExisting: TimeoutAttemptUseCase,
    },
  ],
  exports: [SubmitAnswerUseCase, SubmitAttemptUseCase, GetQuestionSolutionUseCase, GetAttemptStateUseCase, TimeoutAttemptUseCase],
})
export class AttemptsModule {}
 

