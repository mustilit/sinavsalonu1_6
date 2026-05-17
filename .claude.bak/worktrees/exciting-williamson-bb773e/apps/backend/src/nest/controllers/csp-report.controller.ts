import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../decorators/public.decorator';
import { PrismaAuditLogRepository } from '../../infrastructure/repositories/PrismaAuditLogRepository';

@Controller()
export class CspReportController {
  @Post(process.env.CSP_REPORT_ENDPOINT || '/csp-report')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(204)
  async report(@Body() body: any) {
    const report = (body && (body['csp-report'] ?? body)) || {};
    const get = (keys: string[]) => {
      for (const k of keys) {
        if (report[k] !== undefined) return report[k];
      }
      return undefined;
    };

    const blockedUri = get(['blocked-uri', 'blockedUri', 'document-uri', 'documentUri', 'request-uri', 'requestUri']) ?? '';
    const violatedDirective = get(['violated-directive', 'violatedDirective', 'violated']) ?? '';
    const effectiveDirective = get(['effective-directive', 'effectiveDirective']) ?? '';
    const sourceFile = get(['source-file', 'sourceFile']) ?? '';
    const disposition = get(['disposition']) ?? '';
    const userAgent = (report['user-agent'] || report['userAgent'] || '') as string;

    try {
      const auditRepo = new PrismaAuditLogRepository();
      await auditRepo.create({
        action: 'CSP_VIOLATION',
        entityType: 'CSP',
        entityId: '',
        actorId: null,
        metadata: { blockedUri, violatedDirective, effectiveDirective, sourceFile, disposition, userAgent, raw: report },
      });
    } catch {
      // swallow errors to avoid affecting reporter
    }

    return;
  }
}

