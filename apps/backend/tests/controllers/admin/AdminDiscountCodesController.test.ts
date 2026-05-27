/**
 * AdminDiscountCodesController unit testleri.
 */
import { AdminDiscountCodesController } from '../../../src/nest/controllers/admin.discount-codes.controller';

describe('AdminDiscountCodesController', () => {
  let controller: AdminDiscountCodesController;
  let mockListAll: { execute: jest.Mock };
  let mockCreateUC: { execute: jest.Mock };
  let mockToggleUC: { execute: jest.Mock };
  let mockDeleteUC: { execute: jest.Mock };

  const sampleCode = { id: 'dc-1', code: 'SAVE10', percentOff: 10, isActive: true };

  beforeEach(() => {
    mockListAll = { execute: jest.fn().mockResolvedValue([sampleCode]) };
    mockCreateUC = { execute: jest.fn().mockResolvedValue(sampleCode) };
    mockToggleUC = { execute: jest.fn().mockResolvedValue({ ...sampleCode, isActive: false }) };
    mockDeleteUC = { execute: jest.fn().mockResolvedValue({ deleted: true }) };
    controller = new AdminDiscountCodesController(
      mockListAll as any,
      mockCreateUC as any,
      mockToggleUC as any,
      mockDeleteUC as any,
    );
  });

  describe('list', () => {
    it('actorId ile tüm indirim kodlarını listeler', async () => {
      const req = { user: { id: 'admin-1' } };
      const result = await controller.list(req as any);
      expect(mockListAll.execute).toHaveBeenCalledWith('admin-1');
      expect(result).toContainEqual(sampleCode);
    });
  });

  describe('create', () => {
    it('geçerli DTO ile indirim kodu oluşturur', async () => {
      const body = { code: 'SAVE10', percentOff: 10, maxUses: 100, validFrom: '2025-01-01', validUntil: '2025-12-31', description: 'Yılbaşı' } as any;
      const req = { user: { id: 'admin-1' } };
      await controller.create(body, req as any);
      expect(mockCreateUC.execute).toHaveBeenCalledWith('admin-1', {
        code: 'SAVE10',
        percentOff: 10,
        maxUses: 100,
        validFrom: expect.any(Date),
        validUntil: expect.any(Date),
        description: 'Yılbaşı',
      });
    });

    it('maxUses yoksa null iletilir', async () => {
      const body = { code: 'FREE', percentOff: 100 } as any;
      const req = { user: { id: 'admin-1' } };
      await controller.create(body, req as any);
      expect(mockCreateUC.execute).toHaveBeenCalledWith('admin-1', expect.objectContaining({ maxUses: null }));
    });

    it('validFrom/validUntil yoksa null iletilir', async () => {
      const body = { code: 'TEST', percentOff: 5 } as any;
      const req = { user: { id: 'admin-1' } };
      await controller.create(body, req as any);
      expect(mockCreateUC.execute).toHaveBeenCalledWith(
        'admin-1',
        expect.objectContaining({ validFrom: null, validUntil: null }),
      );
    });
  });

  describe('toggle', () => {
    it('id ve actorId ile toggle yapar', async () => {
      const req = { user: { id: 'admin-1' } };
      const result = await controller.toggle('dc-1', req as any);
      expect(mockToggleUC.execute).toHaveBeenCalledWith('admin-1', 'dc-1');
      expect(result).toHaveProperty('isActive', false);
    });
  });

  describe('delete', () => {
    it('id ve actorId ile indirim kodunu siler', async () => {
      const req = { user: { id: 'admin-1' } };
      await controller.delete('dc-1', req as any);
      expect(mockDeleteUC.execute).toHaveBeenCalledWith('admin-1', 'dc-1');
    });
  });
});
