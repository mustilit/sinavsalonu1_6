/**
 * EducatorsController unit testleri.
 * Controller birden fazla use-case ve repository kullanır; hepsi mock'lanır.
 */

jest.mock('../../src/infrastructure/database/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), update: jest.fn() },
    examTest: { findMany: jest.fn() },
    purchase: { findMany: jest.fn() },
  },
}));

jest.mock('../../src/infrastructure/repositories/PrismaUserRepository', () => ({
  PrismaUserRepository: jest.fn().mockImplementation(() => ({
    findById: jest.fn(),
    update: jest.fn(),
  })),
}));
jest.mock('../../src/infrastructure/repositories/PrismaExamRepository', () => ({
  PrismaExamRepository: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../src/infrastructure/repositories/PrismaTestStatsRepository', () => ({
  PrismaTestStatsRepository: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../src/application/services/ReviewAggregationService', () => ({
  ReviewAggregationService: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../src/application/use-cases/educator/GetEducatorPageUseCase', () => ({
  GetEducatorPageUseCase: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue({ id: 'edu-1', username: 'hoca1', tests: [] }),
  })),
}));

import { EducatorsController } from '../../src/nest/controllers/educators.controller';

const mockUpdateProfile = jest.fn().mockResolvedValue({ id: 'edu-1', name: 'Güncellendi' });
const mockCreateDiscountCode = jest.fn().mockResolvedValue({ id: 'dc-1', code: 'SAVE10' });
const mockListDiscountCodes = jest.fn().mockResolvedValue([{ id: 'dc-1', code: 'SAVE10' }]);
const mockGetSalesReport = jest.fn().mockResolvedValue({ totalSales: 100, totalRevenue: 50000 });
const mockPurchaseAd = jest.fn().mockResolvedValue({ id: 'adp-1', status: 'ACTIVE' });
const mockListAdPurchases = jest.fn().mockResolvedValue([]);
const mockGetAdStats = jest.fn();
const mockListTests = jest.fn().mockResolvedValue([]);
const mockListPurchases = jest.fn().mockResolvedValue([]);
const mockToggleDiscountCode = jest.fn().mockResolvedValue({ id: 'dc-1', isActive: false });
const mockListReviews = jest.fn().mockResolvedValue([]);
const mockListPackageViews = jest.fn().mockResolvedValue([]);

describe('EducatorsController', () => {
  let controller: EducatorsController;
  const mockUserRepo = {};
  const mockAuditRepo = {};

  beforeEach(() => {
    jest.clearAllMocks();
    // Constructor sırası: userRepo, auditRepo, createDiscountCodeUC, listDiscountCodesUC,
    // getSalesReportUC, purchaseAdUC, listAdPurchasesUC, listTestsUC, listPurchasesUC, toggleDiscountCodeUC
    controller = new EducatorsController(
      mockUserRepo as any,
      mockAuditRepo as any,
      { execute: mockCreateDiscountCode } as any,
      { execute: mockListDiscountCodes } as any,
      { execute: mockGetSalesReport } as any,
      { execute: mockPurchaseAd } as any,
      { execute: mockListAdPurchases } as any,
      { execute: mockListTests } as any,
      { execute: mockListPurchases } as any,
      { execute: mockToggleDiscountCode } as any,
    );
  });

  describe('patchMe', () => {
    it('controller patchMe metodu tanımlıdır', () => {
      // patchMe controller içinde UpdateEducatorProfileUseCase'i dinamik örnekleyerek çağırır.
      // Yöntemin varlığını doğruluyoruz; entegrasyon testi kapsamında daha derin test edilir.
      expect(typeof controller.patchMe).toBe('function');
    });
  });

  describe('createDiscountCode', () => {
    it('educatorId ve DTO ile indirim kodu oluşturur', async () => {
      const req = { user: { id: 'edu-1' } };
      const dto = { code: 'SAVE10', percentOff: 10, maxUses: 50 } as any;
      const result = await controller.createDiscountCode(req as any, dto);
      expect(mockCreateDiscountCode).toHaveBeenCalledWith('edu-1', expect.any(Object));
      expect(result).toHaveProperty('id', 'dc-1');
    });
  });

  describe('listDiscountCodes', () => {
    it('educatorId ile kendi indirim kodlarını listeler', async () => {
      const req = { user: { id: 'edu-1' } };
      const result = await controller.listDiscountCodes(req as any);
      expect(mockListDiscountCodes).toHaveBeenCalledWith('edu-1');
      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('toggleDiscountCode', () => {
    it('indirim kodu aktif/pasif yapar', async () => {
      const req = { user: { id: 'edu-1' } };
      const result = await controller.toggleDiscountCode(req as any, 'dc-1');
      // Controller execute(educatorId, id) olarak çağırır
      expect(mockToggleDiscountCode).toHaveBeenCalledWith('edu-1', 'dc-1');
      expect(result).toHaveProperty('isActive', false);
    });
  });

  describe('getSalesReport', () => {
    it('educatorId ile satış raporunu getirir', async () => {
      const req = { user: { id: 'edu-1' } };
      const result = await controller.getSalesReport(req as any);
      // Controller execute(educatorId) sade string olarak çağırır
      expect(mockGetSalesReport).toHaveBeenCalledWith('edu-1');
      expect(result).toHaveProperty('totalSales');
    });
  });

  describe('listMyTests', () => {
    it('educatorId ile testleri listeler', async () => {
      const req = { user: { id: 'edu-1' } };
      const result = await controller.listMyTests(req as any);
      // Controller execute(educatorId) sade string olarak çağırır
      expect(mockListTests).toHaveBeenCalledWith('edu-1');
    });
  });

  describe('listMySales', () => {
    it('educatorId ile satışları listeler', async () => {
      const req = { user: { id: 'edu-1' } };
      const result = await controller.listMySales(req as any);
      // Controller execute(educatorId) sade string olarak çağırır
      expect(mockListPurchases).toHaveBeenCalledWith('edu-1');
    });
  });
});
