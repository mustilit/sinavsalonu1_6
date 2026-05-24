import 'reflect-metadata';
import { firstValueFrom, of, throwError } from 'rxjs';
import { MetricsInterceptor } from '../../src/nest/interceptors/metrics.interceptor';
import {
  httpRequestsTotal,
  httpRequestDurationSeconds,
  httpExceptionsTotal,
  metricsRegistry,
} from '../../src/infrastructure/metrics/metrics';

const makeCtx = (overrides: Partial<{ method: string; route: string; status: number }> = {}) => {
  const req: any = {
    method: overrides.method ?? 'GET',
    baseUrl: '',
    path: overrides.route ?? '/test/route',
    route: { path: overrides.route ?? '/test/route' },
  };
  const res: any = { statusCode: overrides.status ?? 200 };
  const switchToHttp = () => ({ getRequest: () => req, getResponse: () => res });
  return { switchToHttp } as any;
};

const labelValue = async (metric: any, labels: Record<string, string>) => {
  const data = await metric.get();
  const found = data.values.find((v: any) =>
    Object.entries(labels).every(([k, val]) => v.labels[k] === val),
  );
  return found?.value ?? 0;
};

describe('MetricsInterceptor — prom-client köprüsü', () => {
  beforeEach(() => {
    // Her test öncesi metric kayıt deposunu sıfırla — diğer testlerden bağımsız ölç.
    metricsRegistry.resetMetrics();
  });

  it('başarılı istekte httpRequestsTotal ve duration histogram artar', async () => {
    const interceptor = new MetricsInterceptor();
    const ctx = makeCtx({ method: 'GET', route: '/health', status: 200 });

    await firstValueFrom(interceptor.intercept(ctx, { handle: () => of({ ok: true }) }));

    const counter = await labelValue(httpRequestsTotal, {
      route: '/health',
      method: 'GET',
      status_code: '200',
    });
    expect(counter).toBe(1);

    const histData: any = await httpRequestDurationSeconds.get();
    const histEntry = histData.values.find(
      (v: any) =>
        v.metricName === 'dal_http_request_duration_seconds_count' &&
        v.labels.route === '/health',
    );
    expect(histEntry?.value).toBe(1);
  });

  it('exception path: httpExceptionsTotal + counter artar, status_code error.status', async () => {
    const interceptor = new MetricsInterceptor();
    const ctx = makeCtx({ method: 'POST', route: '/admin/users', status: 200 });

    const err: any = new Error('forbidden');
    err.status = 403;
    err.response = { error: 'WORKER_PAGE_FORBIDDEN' };

    await firstValueFrom(
      interceptor.intercept(ctx, { handle: () => throwError(() => err) }),
    ).catch(() => null);

    const reqCount = await labelValue(httpRequestsTotal, {
      route: '/admin/users',
      method: 'POST',
      status_code: '403',
    });
    expect(reqCount).toBe(1);

    const excCount = await labelValue(httpExceptionsTotal, {
      status_code: '403',
      error_code: 'WORKER_PAGE_FORBIDDEN',
    });
    expect(excCount).toBe(1);
  });

  it('birden fazla istek toplam counter\'ı doğru biriktirir', async () => {
    const interceptor = new MetricsInterceptor();
    const ctx = makeCtx({ method: 'GET', route: '/marketplace/tests', status: 200 });

    for (let i = 0; i < 5; i++) {
      await firstValueFrom(interceptor.intercept(ctx, { handle: () => of({ ok: true }) }));
    }

    const counter = await labelValue(httpRequestsTotal, {
      route: '/marketplace/tests',
      method: 'GET',
      status_code: '200',
    });
    expect(counter).toBe(5);
  });

  it('metricsRegistry.metrics() Prometheus text formatında çıktı verir', async () => {
    const interceptor = new MetricsInterceptor();
    await firstValueFrom(
      interceptor.intercept(makeCtx({ route: '/health', status: 200 }), {
        handle: () => of({ ok: true }),
      }),
    );

    const text = await metricsRegistry.metrics();

    expect(text).toContain('# HELP dal_http_requests_total');
    expect(text).toContain('# TYPE dal_http_requests_total counter');
    expect(text).toMatch(/dal_http_requests_total\{[^}]*route="\/health"[^}]*\}\s+1/);
    // Default prom-client metrik'leri de kayıtlı mı?
    expect(text).toContain('process_cpu_user_seconds_total');
    expect(text).toContain('nodejs_heap_size_used_bytes');
  });
});
