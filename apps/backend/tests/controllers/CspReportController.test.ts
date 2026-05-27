/**
 * CspReportController unit testleri.
 * PrismaAuditLogRepository mock'lanır.
 */

jest.mock('../../src/infrastructure/database/prisma', () => ({
  prisma: {
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    },
  },
}));

const mockCreate = jest.fn().mockResolvedValue({ id: 'audit-1' });

jest.mock('../../src/infrastructure/repositories/PrismaAuditLogRepository', () => ({
  PrismaAuditLogRepository: jest.fn().mockImplementation(() => ({
    create: mockCreate,
  })),
}));

import { CspReportController } from '../../src/nest/controllers/csp-report.controller';

describe('CspReportController', () => {
  let controller: CspReportController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new CspReportController();
  });

  describe('report', () => {
    it('CSP ihlal raporunu audit log\'a kaydeder ve 204 döner', async () => {
      const body = {
        'csp-report': {
          'blocked-uri': 'https://evil.com/script.js',
          'violated-directive': 'script-src',
          'source-file': 'https://app.example.com/page',
        },
      };
      const result = await controller.report(body);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CSP_VIOLATION',
          entityType: 'CSP',
        }),
      );
      expect(result).toBeUndefined();
    });

    it('Firefox formatında (düz nesne) gelen raporu işler', async () => {
      const body = {
        'blocked-uri': 'https://tracker.com',
        'violated-directive': 'connect-src',
      };
      const result = await controller.report(body);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CSP_VIOLATION' }),
      );
      expect(result).toBeUndefined();
    });

    it('boş body durumunda bile hata fırlatmaz', async () => {
      const result = await controller.report(null);
      expect(result).toBeUndefined();
    });

    it('audit log hatası sessizce yutulur (204 dönmeye devam)', async () => {
      mockCreate.mockRejectedValueOnce(new Error('DB_ERROR'));
      const body = { 'csp-report': { 'blocked-uri': 'https://x.com' } };
      const result = await controller.report(body);
      expect(result).toBeUndefined();
    });
  });
});
