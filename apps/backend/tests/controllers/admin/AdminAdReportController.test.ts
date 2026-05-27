/**
 * AdminAdReportController unit testleri.
 */
import { AdminAdReportController } from '../../../src/nest/controllers/admin.ad-report.controller';

describe('AdminAdReportController', () => {
  let controller: AdminAdReportController;
  let mockReportUC: { execute: jest.Mock };

  beforeEach(() => {
    mockReportUC = { execute: jest.fn().mockResolvedValue({ items: [], total: 0 }) };
    controller = new AdminAdReportController(mockReportUC as any);
  });

  describe('report', () => {
    it('tüm filtreler parse edilerek use case\'e iletilir', async () => {
      await controller.report('2025', '3', 'edu-1', 'TEST');
      expect(mockReportUC.execute).toHaveBeenCalledWith({
        year: 2025,
        month: 3,
        educatorId: 'edu-1',
        targetType: 'TEST',
      });
    });

    it('EDUCATOR targetType geçerli', async () => {
      await controller.report(undefined, undefined, undefined, 'EDUCATOR');
      expect(mockReportUC.execute).toHaveBeenCalledWith(
        expect.objectContaining({ targetType: 'EDUCATOR' }),
      );
    });

    it('geçersiz targetType undefined\'a dönüştürülür', async () => {
      await controller.report(undefined, undefined, undefined, 'INVALID');
      expect(mockReportUC.execute).toHaveBeenCalledWith(
        expect.objectContaining({ targetType: undefined }),
      );
    });

    it('boş parametrelerle çağrıldığında undefined değerleri iletilir', async () => {
      await controller.report(undefined, undefined, undefined, undefined);
      expect(mockReportUC.execute).toHaveBeenCalledWith({
        year: undefined,
        month: undefined,
        educatorId: undefined,
        targetType: undefined,
      });
    });

    it('use case sonucunu döndürür', async () => {
      const data = { items: [{ id: 'ap1', educatorId: 'e1' }], total: 1 };
      mockReportUC.execute.mockResolvedValue(data);
      const result = await controller.report('2025', '1');
      expect(result).toEqual(data);
    });
  });
});
