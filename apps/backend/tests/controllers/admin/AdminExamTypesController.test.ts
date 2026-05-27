/**
 * AdminExamTypesController unit testleri.
 */
import { AdminExamTypesController } from '../../../src/nest/controllers/admin.exam-types.controller';

describe('AdminExamTypesController', () => {
  let controller: AdminExamTypesController;
  let mockListExamTypes: { execute: jest.Mock };
  let mockCreateExamType: { execute: jest.Mock };
  let mockUpdateExamType: { execute: jest.Mock };
  let mockDeleteExamType: { execute: jest.Mock };

  const examType = { id: 'et-1', name: 'KPSS', slug: 'kpss', active: true };

  beforeEach(() => {
    mockListExamTypes = { execute: jest.fn().mockResolvedValue([examType]) };
    mockCreateExamType = { execute: jest.fn().mockResolvedValue(examType) };
    mockUpdateExamType = { execute: jest.fn().mockResolvedValue({ ...examType, name: 'KPSS Güncel' }) };
    mockDeleteExamType = { execute: jest.fn().mockResolvedValue({ deleted: true }) };

    controller = new AdminExamTypesController(
      mockListExamTypes as any,
      mockCreateExamType as any,
      mockUpdateExamType as any,
      mockDeleteExamType as any,
    );
  });

  describe('list', () => {
    it('varsayılan olarak activeOnly=true ile listeler', async () => {
      const result = await controller.list({} as any);
      expect(mockListExamTypes.execute).toHaveBeenCalledWith(true);
      expect(result).toBeInstanceOf(Array);
    });

    it('activeOnly=false ile tüm sınav türleri listelenir', async () => {
      await controller.list({ activeOnly: 'false' } as any);
      expect(mockListExamTypes.execute).toHaveBeenCalledWith(false);
    });

    it('activeOnly başka değer ise true kullanılır', async () => {
      await controller.list({ activeOnly: 'true' } as any);
      expect(mockListExamTypes.execute).toHaveBeenCalledWith(true);
    });
  });

  describe('create', () => {
    it('actorId ve DTO ile sınav türü oluşturur', async () => {
      const body = { name: 'KPSS', slug: 'kpss', description: 'KPSS sınavı', active: true } as any;
      const req = { user: { id: 'admin-1' } };
      const result = await controller.create(body, req as any);
      expect(mockCreateExamType.execute).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'KPSS', slug: 'kpss' }),
        'admin-1',
      );
      expect(result).toHaveProperty('id', 'et-1');
    });
  });

  describe('update', () => {
    it('sınav türü günceller', async () => {
      const body = { name: 'KPSS Güncel' } as any;
      const req = { user: { id: 'admin-1' } };
      const result = await controller.update('et-1', body, req as any);
      expect(mockUpdateExamType.execute).toHaveBeenCalledWith(
        'et-1',
        expect.objectContaining({ name: 'KPSS Güncel' }),
        'admin-1',
      );
      expect(result).toHaveProperty('name', 'KPSS Güncel');
    });
  });

  describe('delete', () => {
    it('sınav türü siler', async () => {
      const req = { user: { id: 'admin-1' } };
      const result = await controller.delete('et-1', req as any);
      expect(mockDeleteExamType.execute).toHaveBeenCalledWith('et-1', 'admin-1');
    });
  });
});
