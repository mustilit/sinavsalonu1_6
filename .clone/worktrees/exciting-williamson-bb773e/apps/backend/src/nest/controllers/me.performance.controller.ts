import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { Roles } from '../decorators/roles.decorator';
import { GetTopicPerformanceUseCase } from '../../application/use-cases/GetTopicPerformanceUseCase';

/**
 * Giriş yapmış adayın konu bazlı performans raporunu sunar.
 * Her konu + sınav türü çifti için zamana bağlı istatistik döndürür.
 */
@Controller('me')
@ApiTags('me')
@ApiBearerAuth('bearer')
export class MePerformanceController {
  constructor(private readonly topicPerformanceUC: GetTopicPerformanceUseCase) {}

  /**
   * Adayın tamamladığı denemeleri konu ve sınav türüne göre gruplar;
   * her grup için toplam/doğru/yanlış/boş istatistikleri ve zaman serisi döner.
   *
   * Yalnızca SUBMITTED ve TIMEOUT durumdaki denemeler dahil edilir.
   */
  @Get('topic-performance')
  @Roles('CANDIDATE', 'ADMIN')
  @ApiOkResponse({ description: 'Topic-based performance grouped by exam type with time series' })
  async topicPerformance(@Req() req: any) {
    // JWT guard tarafından doldurulmuş kullanıcı kimliği
    const candidateId = (req as any).user?.id;
    return this.topicPerformanceUC.execute(candidateId);
  }
}
