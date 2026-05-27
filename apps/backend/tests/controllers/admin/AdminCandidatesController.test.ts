/**
 * AdminCandidatesController unit testleri.
 */
import { AdminCandidatesController } from '../../../src/nest/controllers/admin.candidates.controller';

describe('AdminCandidatesController', () => {
  let controller: AdminCandidatesController;
  let mockGetReport: { execute: jest.Mock };
  let mockSendBulkEmail: { execute: jest.Mock };

  beforeEach(() => {
    mockGetReport = { execute: jest.fn().mockResolvedValue({ items: [], total: 0 }) };
    mockSendBulkEmail = { execute: jest.fn().mockResolvedValue({ sent: 5, failed: 0 }) };
    controller = new AdminCandidatesController(mockGetReport as any, mockSendBulkEmail as any);
  });

  describe('report', () => {
    it('filtre parametreleri use case\'e iletilir', async () => {
      // Arrange
      const query = { q: 'ali', status: 'ACTIVE', minPurchases: '2', maxPurchases: '10', page: '1', limit: '20' };

      // Act
      await controller.report(query);

      // Assert
      expect(mockGetReport.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          q: 'ali',
          status: 'ACTIVE',
          minPurchases: 2,
          maxPurchases: 10,
          page: 1,
          limit: 20,
        }),
      );
    });

    it('boş query ile çağrıldığında undefined değerler iletilir', async () => {
      await controller.report({});
      expect(mockGetReport.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          q: undefined,
          minPurchases: undefined,
        }),
      );
    });

    it('hasNeverLoggedIn string "true" boolean\'a çevrilir', async () => {
      await controller.report({ hasNeverLoggedIn: 'true' });
      expect(mockGetReport.execute).toHaveBeenCalledWith(
        expect.objectContaining({ hasNeverLoggedIn: true }),
      );
    });

    it('hasNeverLoggedIn "false" boolean false\'a çevrilir', async () => {
      await controller.report({ hasNeverLoggedIn: 'false' });
      expect(mockGetReport.execute).toHaveBeenCalledWith(
        expect.objectContaining({ hasNeverLoggedIn: false }),
      );
    });

    it('use case sonucunu döndürür', async () => {
      const mockResult = { items: [{ id: 'u1', name: 'Aday 1' }], total: 1 };
      mockGetReport.execute.mockResolvedValue(mockResult);
      const result = await controller.report({});
      expect(result).toEqual(mockResult);
    });
  });

  describe('bulkEmail', () => {
    it('geçerli body ile use case\'i çağırır', async () => {
      // Arrange
      const body = { candidateIds: ['u1', 'u2'], subject: 'Test Mail', body: 'İçerik' };

      // Act
      const result = await controller.bulkEmail(body);

      // Assert
      expect(mockSendBulkEmail.execute).toHaveBeenCalledWith({
        candidateIds: ['u1', 'u2'],
        subject: 'Test Mail',
        body: 'İçerik',
      });
      expect(result).toEqual({ sent: 5, failed: 0 });
    });

    it('use case hata fırlattığında HttpException döner', async () => {
      mockSendBulkEmail.execute.mockRejectedValueOnce(Object.assign(new Error('Geçersiz alıcı'), { status: 400 }));
      await expect(controller.bulkEmail({ candidateIds: [], subject: 's', body: 'b' })).rejects.toBeDefined();
    });
  });
});
