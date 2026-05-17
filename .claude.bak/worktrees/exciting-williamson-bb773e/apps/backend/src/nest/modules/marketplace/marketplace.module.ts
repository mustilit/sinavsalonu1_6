import { Module } from '@nestjs/common';
import { MarketplaceController } from './marketplace.controller';
import { ListMarketplaceTestsUseCase } from '../../../application/use-cases/ListMarketplaceTestsUseCase';
import { PrismaExamRepository } from '../../../infrastructure/repositories/PrismaExamRepository';

@Module({
  controllers: [MarketplaceController],
  providers: [
    {
      provide: ListMarketplaceTestsUseCase,
      useFactory: () => new ListMarketplaceTestsUseCase(new PrismaExamRepository()),
    },
  ],
  exports: [ListMarketplaceTestsUseCase],
})
export class MarketplaceModule {}

