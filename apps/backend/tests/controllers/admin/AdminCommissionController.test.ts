/**
 * AdminCommissionController unit testleri.
 */
import { AdminCommissionController } from '../../../src/nest/controllers/admin.commission.controller';

describe('AdminCommissionController', () => {
  let controller: AdminCommissionController;
  let mockGetReport: { execute: jest.Mock; exportCsv: jest.Mock };
  let mockGetRateHistory: { execute: jest.Mock };
  let mockUpdateRate: { execute: jest.Mock };

  beforeEach(() => {
    mockGetReport = {
      execute: jest.fn().mockResolvedValue({ rows: [], totals: {} }),
      exportCsv: jest.fn().mockResolvedValue('col1,col2\nval1,val2'),
    };
    mockGetRateHistory = { execute: jest.fn().mockResolvedValue([{ id: 'r1', commissionPercent: 20 }]) };
    mockUpdateRate = { execute: jest.fn().mockResolvedValue({ id: 'r2', commissionPercent: 15 }) };
    controller = new AdminCommissionController(mockGetReport as any, mockGetRateHistory as any, mockUpdateRate as any);
  });

  describe('report', () => {
    it('year ve month parametrelerini kullanır', async () => {
      await controller.report(2025, 3);
      expect(mockGetReport.execute).toHaveBeenCalledWith(2025, 3);
    });

    it('sonucu döndürür', async () => {
      mockGetReport.execute.mockResolvedValue({ rows: [{ educatorId: 'e1', earned: 1000 }] });
      const result = await controller.report(2025, 1);
      expect(result).toHaveProperty('rows');
    });
  });

  describe('exportCsv', () => {
    it('doğru ay/yıl ile CSV oluşturur ve response header ayarlar', async () => {
      const resMock = { setHeader: jest.fn(), send: jest.fn() };
      await controller.exportCsv(2025, 5, resMock as any);
      expect(mockGetReport.exportCsv).toHaveBeenCalledWith(2025, 5);
      expect(resMock.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
      expect(resMock.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('komisyon-raporu-2025-05.csv'),
      );
      expect(resMock.send).toHaveBeenCalled();
    });

    it('tek haneli ay iki basamaklı formatlanır', async () => {
      const resMock = { setHeader: jest.fn(), send: jest.fn() };
      await controller.exportCsv(2025, 3, resMock as any);
      expect(resMock.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('komisyon-raporu-2025-03.csv'),
      );
    });
  });

  describe('getRates', () => {
    it('komisyon oranı geçmişini döndürür', async () => {
      const result = await controller.getRates();
      expect(mockGetRateHistory.execute).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('createRate', () => {
    it('DTO verilerini use case\'e iletir', async () => {
      const dto = { commissionPercent: 15, effectiveFrom: '2025-06-01', note: 'Yeni oran' } as any;
      await controller.createRate(dto);
      expect(mockUpdateRate.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          commissionPercent: 15,
          note: 'Yeni oran',
        }),
      );
    });

    it('effectiveFrom yoksa undefined iletilir', async () => {
      const dto = { commissionPercent: 20 } as any;
      await controller.createRate(dto);
      expect(mockUpdateRate.execute).toHaveBeenCalledWith(
        expect.objectContaining({ effectiveFrom: undefined }),
      );
    });
  });
});
