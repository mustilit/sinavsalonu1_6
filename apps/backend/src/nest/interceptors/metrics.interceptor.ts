import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { httpRequestsTotal, httpRequestDurationSeconds, httpExceptionsTotal } from '../../infrastructure/metrics/metrics';

/**
 * Her HTTP isteğini prom-client metric'lerine kaydeder.
 *
 * Label seçimi:
 *  - route: NestJS handler'ın path pattern'i (ör. "/users/:id"). Param değerleri
 *    label'a girmediği için cardinality patlamaz.
 *  - method: HTTP method.
 *  - status_code: yanıt status'u (exception'da filter'ın belirleyeceği değer).
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    const startNs = process.hrtime.bigint();
    const method = String(req.method || 'UNKNOWN');
    // Express route pattern (ör. "/users/:id"). req.route?.path yalnız handler
    // çağrıldıktan sonra dolar; bu yüzden tap() içinde okuyoruz.
    const resolveRoute = (): string => {
      const base = req.baseUrl || '';
      const path = req.route?.path || req.path || 'unknown';
      return `${base}${path}` || 'unknown';
    };

    const observeOk = () => {
      const durSec = Number(process.hrtime.bigint() - startNs) / 1e9;
      const route = resolveRoute();
      const status = String(res.statusCode ?? 200);
      httpRequestsTotal.inc({ route, method, status_code: status });
      httpRequestDurationSeconds.observe({ route, method, status_code: status }, durSec);
    };

    const observeError = (err: any) => {
      const durSec = Number(process.hrtime.bigint() - startNs) / 1e9;
      const route = resolveRoute();
      const status = String(err?.status ?? err?.statusCode ?? 500);
      const errorCode = String(err?.response?.error ?? err?.code ?? err?.name ?? 'UNKNOWN').slice(0, 80);
      httpRequestsTotal.inc({ route, method, status_code: status });
      httpRequestDurationSeconds.observe({ route, method, status_code: status }, durSec);
      httpExceptionsTotal.inc({ status_code: status, error_code: errorCode });
    };

    return next.handle().pipe(
      tap({
        next: observeOk,
        error: observeError,
      }),
    );
  }
}
