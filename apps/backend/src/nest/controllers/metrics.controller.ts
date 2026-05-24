import { Controller, Get, Header } from '@nestjs/common';
import { Public } from '../decorators/public.decorator';
import { InternalOnly } from '../decorators/internal-only.decorator';
import { metricsRegistry } from '../../infrastructure/metrics/metrics';

/**
 * Prometheus metrik endpoint'i — prom-client Registry içeriğini text/plain
 * formatında döndürür. Default metrics (cpu, eventloop, gc, heap) + HTTP request
 * histogram + exception counter dahil.
 *
 * METRICS_ALLOWED_IPS env'ine tanımlı IP/CIDR (veya loopback) dışındaki istekler
 * 403 alır. @Public JWT zorunluluğunu kapatır; IP allowlist ağ-düzeyi koruma sağlar.
 */
@Controller('metrics')
export class MetricsController {
  @Public()
  @InternalOnly()
  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async metrics(): Promise<string> {
    return metricsRegistry.metrics();
  }
}

