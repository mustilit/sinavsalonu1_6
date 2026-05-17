import { Module } from '@nestjs/common';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import IORedis from 'ioredis';
import { APP_GUARD } from '@nestjs/core';
import { CustomThrottlerGuard } from './guards/throttler.guard';
import { TestsController } from './controllers/tests.controller';
import { RootController } from './controllers/root.controller';
import { HealthController } from './controllers/health.controller';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ExamTypesModule } from './modules/exam-types/exam-types.module';
import { TestsModule } from './modules/tests/tests.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { AttemptsModule } from './modules/attempts/attempts.module';
import { AuditModule } from './modules/audit/audit.module';
import { CronModule } from './modules/cron/cron.module';
import { NotificationsController } from './controllers/notifications.controller';
import { AdminDlqController } from './controllers/admin.dlq.controller';
import { TestsPerformanceController } from './controllers/tests.performance.controller';
import { HomeController } from './controllers/home.controller';
import { ReviewsController } from './controllers/reviews.controller';
import { EducatorsController } from './controllers/educators.controller';
import { FollowsController } from './controllers/follows.controller';
import { CspReportController } from './controllers/csp-report.controller';
import { AdminExamTypesController } from './controllers/admin.exam-types.controller';
import { AdminTopicsController } from './controllers/admin.topics.controller';
import { AdminEducatorsController } from './controllers/admin.educators.controller';
import { ObjectionsController } from './controllers/objections.controller';
import { EducatorObjectionsController } from './controllers/educator-objections.controller';
import { AdminObjectionsController } from './controllers/admin.objections.controller';
import { AdminRefundsController } from './controllers/admin.refunds.controller';
import { AdminSettingsController } from './controllers/admin.settings.controller';
import { AdminSiteSettingsController } from './controllers/admin.site-settings.controller';
import { SiteController } from './controllers/site.controller';
import { AdminContractsController } from './controllers/admin.contracts.controller';
import { AdminAuditController } from './controllers/admin.audit.controller';
import { AdminAdPackagesController } from './controllers/admin.ad-packages.controller';
import { AdPackagesController } from './controllers/ad-packages.controller';
import { MeRefundsController } from './controllers/me.refunds.controller';
import { MePurchasesController } from './controllers/me.purchases.controller';
import { MePreferencesController } from './controllers/me.preferences.controller';
import { AdminUsersController } from './controllers/admin.users.controller';
import { SeedService } from './bootstrap/seed.service';
import { PrismaExamTypeRepository } from '../infrastructure/repositories/PrismaExamTypeRepository';
import { PrismaAuditLogRepository } from '../infrastructure/repositories/PrismaAuditLogRepository';
import { PrismaTopicRepository } from '../infrastructure/repositories/PrismaTopicRepository';
import { ListExamTypesUseCase } from '../application/use-cases/ListExamTypesUseCase';
import { CreateExamTypeUseCase } from '../application/use-cases/CreateExamTypeUseCase';
import { UpdateExamTypeUseCase } from '../application/use-cases/UpdateExamTypeUseCase';
import { DeleteExamTypeUseCase } from '../application/use-cases/DeleteExamTypeUseCase';
import { ListTopicsByExamTypeUseCase } from '../application/use-cases/ListTopicsByExamTypeUseCase';
import { CreateTopicUseCase } from '../application/use-cases/CreateTopicUseCase';
import { UpdateTopicUseCase } from '../application/use-cases/UpdateTopicUseCase';
import { DeleteTopicUseCase } from '../application/use-cases/DeleteTopicUseCase';
import { ApproveEducatorUseCase } from '../application/use-cases/ApproveEducatorUseCase';
import { SuspendEducatorUseCase } from '../application/use-cases/SuspendEducatorUseCase';
import { UnsuspendEducatorUseCase } from '../application/use-cases/UnsuspendEducatorUseCase';
import { PrismaUserRepository } from '../infrastructure/repositories/PrismaUserRepository';
import { PrismaObjectionRepository } from '../infrastructure/repositories/PrismaObjectionRepository';
import { PrismaAttemptRepository } from '../infrastructure/repositories/PrismaAttemptRepository';
import { PrismaExamRepository } from '../infrastructure/repositories/PrismaExamRepository';
import { getRedisUrl } from '../config/redis';
import { CreateObjectionUseCase } from '../application/use-cases/CreateObjectionUseCase';
import { AnswerObjectionUseCase } from '../application/use-cases/AnswerObjectionUseCase';
import { ListEscalatedObjectionsUseCase } from '../application/use-cases/ListEscalatedObjectionsUseCase';
import { ApproveRefundUseCase } from '../application/use-cases/ApproveRefundUseCase';
import { RejectRefundUseCase } from '../application/use-cases/RejectRefundUseCase';
import { ListMyRefundsUseCase } from '../application/use-cases/ListMyRefundsUseCase';
import { ListMyPurchasesUseCase } from '../application/use-cases/ListMyPurchasesUseCase';
import { PrismaPurchaseRepository } from '../infrastructure/repositories/PrismaPurchaseRepository';
import { ListPendingRefundsUseCase } from '../application/use-cases/ListPendingRefundsUseCase';
import { RefundProcessor } from '../application/services/RefundProcessor';
import { PrismaRefundRepository } from '../infrastructure/repositories/PrismaRefundRepository';
import { EXAM_TYPE_REPO, TOPIC_REPO, USER_REPO, OBJECTION_REPO, AUDIT_LOG_REPO, CONTRACT_REPO } from '../application/constants';
import { ContractsModule } from './modules/contracts/contracts.module';
import { GetAdminSettingsUseCase } from '../application/use-cases/GetAdminSettingsUseCase';
import { UpdateAdminSettingsUseCase } from '../application/use-cases/UpdateAdminSettingsUseCase';
import { GetSiteSettingsUseCase } from '../application/use-cases/GetSiteSettingsUseCase';
import { UpdateSiteSettingsUseCase } from '../application/use-cases/UpdateSiteSettingsUseCase';
import { ListFeaturedEducatorsUseCase } from '../application/use-cases/ListFeaturedEducatorsUseCase';
import { ListContractsUseCase } from '../application/use-cases/ListContractsUseCase';
import { CreateContractUseCase } from '../application/use-cases/CreateContractUseCase';
import { UpdateContractUseCase } from '../application/use-cases/UpdateContractUseCase';
import { ListAuditLogsUseCase } from '../application/use-cases/ListAuditLogsUseCase';
import { CreateDiscountCodeUseCase } from '../application/use-cases/CreateDiscountCodeUseCase';
import { ListEducatorDiscountCodesUseCase } from '../application/use-cases/ListEducatorDiscountCodesUseCase';
import { GetEducatorSalesReportUseCase } from '../application/use-cases/GetEducatorSalesReportUseCase';
import { CreateAdPackageUseCase } from '../application/use-cases/CreateAdPackageUseCase';
import { ListAdPackagesUseCase } from '../application/use-cases/ListAdPackagesUseCase';
import { UpdateAdPackageUseCase } from '../application/use-cases/UpdateAdPackageUseCase';
import { DeleteAdPackageUseCase } from '../application/use-cases/DeleteAdPackageUseCase';
import { PurchaseAdUseCase } from '../application/use-cases/PurchaseAdUseCase';
import { ListEducatorAdPurchasesUseCase } from '../application/use-cases/ListEducatorAdPurchasesUseCase';
import { ListEducatorTestsUseCase } from '../application/use-cases/ListEducatorTestsUseCase';
import { ListEducatorPurchasesUseCase } from '../application/use-cases/ListEducatorPurchasesUseCase';
import { DeleteDiscountCodeUseCase } from '../application/use-cases/DeleteDiscountCodeUseCase';
import { AttemptsController } from './controllers/attempts.controller';
import { MetricsController } from './controllers/metrics.controller';

const THROTTLE_TTL_SECONDS = Number(process.env.THROTTLE_TTL_SECONDS ?? '60') || 60;

const throttleDisabled =
  process.env.THROTTLE_DISABLED === '1' &&
  (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'local');

@Module({
  imports: [
    ...(throttleDisabled
      ? []
      : [
          ThrottlerModule.forRootAsync({
            useFactory: () => {
              // Dev: THROTTLE_DISABLED=1 veya NODE_ENV=development → gevşek limit
              const isDev = process.env.NODE_ENV === 'development';
              const limit = isDev ? 500 : 60;
              const throttlers = [{ ttl: seconds(THROTTLE_TTL_SECONDS), limit }];

              if (process.env.REDIS_DISABLED === '1') {
                return { throttlers };
              }
              const redisUrl = getRedisUrl();
              if (redisUrl) {
                const redis = new IORedis(redisUrl, { maxRetriesPerRequest: 2 });
                // graceful shutdown hooks (best-effort)
                const shutdown = () => {
                  try {
                    redis.disconnect();
                  } catch (e) {
                    /* ignore */
                  }
                };
                process.on('beforeExit', shutdown);
                process.on('SIGINT', () => {
                  shutdown();
                  process.exit(0);
                });
                process.on('SIGTERM', () => {
                  shutdown();
                  process.exit(0);
                });
                return {
                  storage: new ThrottlerStorageRedisService(redis),
                  throttlers,
                };
              }
              return { throttlers };
            },
          }),
        ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    MarketplaceModule,
    ExamTypesModule,
    TestsModule,
    QuestionsModule,
    PurchasesModule,
    AttemptsModule,
    AuditModule,
    ...(process.env.CRON_DISABLED === '1' ? [] : [CronModule]),
    // Refunds
    (require('./modules/refunds/refunds.module').RefundsModule),
    ContractsModule,
  ],
  controllers: [RootController, HealthController, NotificationsController, AdminDlqController, TestsPerformanceController, HomeController, SiteController, ReviewsController, EducatorsController, FollowsController, CspReportController, AdminExamTypesController, AdminTopicsController, AdminEducatorsController, AdminUsersController, ObjectionsController, EducatorObjectionsController, AdminObjectionsController, AdminRefundsController, AdminSettingsController, AdminSiteSettingsController, AdminContractsController, AdminAuditController, AdminAdPackagesController, AdPackagesController, MeRefundsController, MePurchasesController, MePreferencesController, MetricsController],
  providers: [
    SeedService,
    ...(throttleDisabled ? [] : [{ provide: APP_GUARD, useClass: CustomThrottlerGuard }]),
    { provide: EXAM_TYPE_REPO, useClass: PrismaExamTypeRepository },
    { provide: TOPIC_REPO, useClass: PrismaTopicRepository },
    { provide: USER_REPO, useClass: PrismaUserRepository },
    { provide: OBJECTION_REPO, useClass: PrismaObjectionRepository },
    { provide: AUDIT_LOG_REPO, useClass: PrismaAuditLogRepository },
    PrismaAuditLogRepository,
    PrismaAttemptRepository,
    PrismaExamRepository,
    ListExamTypesUseCase,
    CreateExamTypeUseCase,
    {
      provide: UpdateExamTypeUseCase,
      useFactory: (repo: PrismaExamTypeRepository, audit: PrismaAuditLogRepository) => new UpdateExamTypeUseCase(repo, audit),
      inject: [EXAM_TYPE_REPO, PrismaAuditLogRepository],
    },
    {
      provide: DeleteExamTypeUseCase,
      useFactory: (repo: PrismaExamTypeRepository, audit: PrismaAuditLogRepository) => new DeleteExamTypeUseCase(repo, audit),
      inject: [EXAM_TYPE_REPO, PrismaAuditLogRepository],
    },
    ListTopicsByExamTypeUseCase,
    CreateTopicUseCase,
    {
      provide: UpdateTopicUseCase,
      useFactory: (repo: PrismaTopicRepository, audit: PrismaAuditLogRepository) => new UpdateTopicUseCase(repo, audit),
      inject: [TOPIC_REPO, PrismaAuditLogRepository],
    },
    {
      provide: DeleteTopicUseCase,
      useFactory: (repo: PrismaTopicRepository, audit: PrismaAuditLogRepository) => new DeleteTopicUseCase(repo, audit),
      inject: [TOPIC_REPO, PrismaAuditLogRepository],
    },
    ApproveEducatorUseCase,
    SuspendEducatorUseCase,
    UnsuspendEducatorUseCase,
    {
      provide: CreateObjectionUseCase,
      useFactory: (
        objectionRepo: PrismaObjectionRepository,
        attemptRepo: PrismaAttemptRepository,
        examRepo: PrismaExamRepository,
        auditRepo: PrismaAuditLogRepository,
      ) => new CreateObjectionUseCase(objectionRepo, attemptRepo, examRepo, auditRepo),
      inject: [OBJECTION_REPO, PrismaAttemptRepository, PrismaExamRepository, PrismaAuditLogRepository],
    },
    {
      provide: AnswerObjectionUseCase,
      useFactory: (
        objectionRepo: PrismaObjectionRepository,
        userRepo: PrismaUserRepository,
        auditRepo: PrismaAuditLogRepository,
      ) => new AnswerObjectionUseCase(objectionRepo, userRepo, auditRepo),
      inject: [OBJECTION_REPO, USER_REPO, PrismaAuditLogRepository],
    },
    {
      provide: ListEscalatedObjectionsUseCase,
      useFactory: (objectionRepo: PrismaObjectionRepository) => new ListEscalatedObjectionsUseCase(objectionRepo),
      inject: [OBJECTION_REPO],
    },
    PrismaRefundRepository,
    RefundProcessor,
    {
      provide: ApproveRefundUseCase,
      useFactory: (
        refundRepo: PrismaRefundRepository,
        auditRepo: PrismaAuditLogRepository,
        processor: RefundProcessor,
      ) => new ApproveRefundUseCase(refundRepo, auditRepo, processor),
      inject: [PrismaRefundRepository, PrismaAuditLogRepository, RefundProcessor],
    },
    {
      provide: RejectRefundUseCase,
      useFactory: (
        refundRepo: PrismaRefundRepository,
        auditRepo: PrismaAuditLogRepository,
      ) => new RejectRefundUseCase(refundRepo, auditRepo),
      inject: [PrismaRefundRepository, PrismaAuditLogRepository],
    },
    {
      provide: ListMyRefundsUseCase,
      useFactory: (refundRepo: PrismaRefundRepository) => new ListMyRefundsUseCase(refundRepo),
      inject: [PrismaRefundRepository],
    },
    PrismaPurchaseRepository,
    {
      provide: ListMyPurchasesUseCase,
      useFactory: (purchaseRepo: PrismaPurchaseRepository) => new ListMyPurchasesUseCase(purchaseRepo),
      inject: [PrismaPurchaseRepository],
    },
    {
      provide: ListPendingRefundsUseCase,
      useFactory: (refundRepo: PrismaRefundRepository) => new ListPendingRefundsUseCase(refundRepo),
      inject: [PrismaRefundRepository],
    },
    GetAdminSettingsUseCase,
    UpdateAdminSettingsUseCase,
    GetSiteSettingsUseCase,
    UpdateSiteSettingsUseCase,
    ListFeaturedEducatorsUseCase,
    {
      provide: ListContractsUseCase,
      useFactory: (repo: any) => new ListContractsUseCase(repo),
      inject: [CONTRACT_REPO],
    },
    {
      provide: CreateContractUseCase,
      useFactory: (repo: any) => new CreateContractUseCase(repo),
      inject: [CONTRACT_REPO],
    },
    {
      provide: UpdateContractUseCase,
      useFactory: (repo: any) => new UpdateContractUseCase(repo),
      inject: [CONTRACT_REPO],
    },
    {
      provide: ListAuditLogsUseCase,
      useFactory: (auditRepo: PrismaAuditLogRepository) => new ListAuditLogsUseCase(auditRepo),
      inject: [PrismaAuditLogRepository],
    },
    {
      provide: CreateDiscountCodeUseCase,
      useFactory: (userRepo: PrismaUserRepository, auditRepo: PrismaAuditLogRepository) =>
        new CreateDiscountCodeUseCase(userRepo, auditRepo),
      inject: [USER_REPO, PrismaAuditLogRepository],
    },
    {
      provide: ListEducatorDiscountCodesUseCase,
      useFactory: (userRepo: PrismaUserRepository) => new ListEducatorDiscountCodesUseCase(userRepo),
      inject: [USER_REPO],
    },
    {
      provide: GetEducatorSalesReportUseCase,
      useFactory: (userRepo: PrismaUserRepository) => new GetEducatorSalesReportUseCase(userRepo),
      inject: [USER_REPO],
    },
    CreateAdPackageUseCase,
    ListAdPackagesUseCase,
    UpdateAdPackageUseCase,
    DeleteAdPackageUseCase,
    {
      provide: PurchaseAdUseCase,
      useFactory: (userRepo: PrismaUserRepository) => new PurchaseAdUseCase(userRepo),
      inject: [USER_REPO],
    },
    {
      provide: ListEducatorAdPurchasesUseCase,
      useFactory: (userRepo: PrismaUserRepository) => new ListEducatorAdPurchasesUseCase(userRepo),
    },
    {
      provide: ListEducatorTestsUseCase,
      useFactory: (examRepo: PrismaExamRepository) => new ListEducatorTestsUseCase(examRepo),
      inject: [PrismaExamRepository],
    },
    {
      provide: ListEducatorPurchasesUseCase,
      useFactory: (userRepo: PrismaUserRepository) => new ListEducatorPurchasesUseCase(userRepo),
      inject: [USER_REPO],
    },
    {
      provide: DeleteDiscountCodeUseCase,
      useFactory: (userRepo: PrismaUserRepository) => new DeleteDiscountCodeUseCase(userRepo),
      inject: [USER_REPO],
    },
  ],
})
export class AppModule {}

