/**
 * AdminEducatorReportController unit testleri.
 */
import { AdminEducatorReportController } from '../../../src/nest/controllers/admin.educator-report.controller';

describe('AdminEducatorReportController', () => {
  let controller: AdminEducatorReportController;
  let mockGetReport: { execute: jest.Mock };
  let mockSendBulkEmail: { execute: jest.Mock };

  beforeEach(() => {
    mockGetReport = { execute: jest.fn().mockResolvedValue({ items: [], total: 0 }) };
    mockSendBulkEmail = { execute: jest.fn().mockResolvedValue({ sent: 3, failed: 1 }) };
    controller = new AdminEducatorReportController(mockGetReport as any, mockSendBulkEmail as any);
  });

  describe('report', () => {
    it('sayısal parametreler dönüştürülerek use case\'e iletilir', async () => {
      const q = { minTests: '5', maxTests: '50', minSales: '10', maxSales: '200', minRating: '3.5', maxRating: '5.0', page: '2', limit: '25' };
      await controller.report(q);
      expect(mockGetReport.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          minTests: 5,
          maxTests: 50,
          minSales: 10,
          maxSales: 200,
          minRating: 3.5,
          maxRating: 5.0,
          page: 2,
          limit: 25,
        }),
      );
    });

    it('hasOpenObjections "true" string\'i boolean\'a çevrilir', async () => {
      await controller.report({ hasOpenObjections: 'true' });
      expect(mockGetReport.execute).toHaveBeenCalledWith(
        expect.objectContaining({ hasOpenObjections: true }),
      );
    });

    it('string filtreleri olduğu gibi iletilir', async () => {
      await controller.report({ q: 'ahmet', status: 'APPROVED', examTypeId: 'exam-1' });
      expect(mockGetReport.execute).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'ahmet', status: 'APPROVED', examTypeId: 'exam-1' }),
      );
    });

    it('use case sonucunu döndürür', async () => {
      const mockResult = { items: [{ id: 'edu-1', username: 'hoca1' }], total: 1 };
      mockGetReport.execute.mockResolvedValue(mockResult);
      const result = await controller.report({});
      expect(result).toEqual(mockResult);
    });
  });

  describe('bulkEmail', () => {
    it('educator id listesi ile use case\'i çağırır', async () => {
      const body = { educatorIds: ['edu-1', 'edu-2'], subject: 'Duyuru', body: 'İçerik metni' };
      await controller.bulkEmail(body);
      expect(mockSendBulkEmail.execute).toHaveBeenCalledWith({
        educatorIds: ['edu-1', 'edu-2'],
        subject: 'Duyuru',
        body: 'İçerik metni',
      });
    });

    it('use case 400 hata fırlattığında HttpException\'a sarılır', async () => {
      mockSendBulkEmail.execute.mockRejectedValueOnce(Object.assign(new Error('Geçersiz'), { status: 400 }));
      await expect(controller.bulkEmail({ educatorIds: [], subject: 's', body: 'b' })).rejects.toBeDefined();
    });
  });
});
