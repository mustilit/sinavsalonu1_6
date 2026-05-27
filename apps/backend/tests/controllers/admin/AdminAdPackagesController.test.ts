/**
 * AdminAdPackagesController unit testleri.
 */
import { AdminAdPackagesController } from '../../../src/nest/controllers/admin.ad-packages.controller';

describe('AdminAdPackagesController', () => {
  let controller: AdminAdPackagesController;
  let mockListUC: { execute: jest.Mock };
  let mockCreateUC: { execute: jest.Mock };
  let mockUpdateUC: { execute: jest.Mock };
  let mockDeleteUC: { execute: jest.Mock };

  const samplePackage = { id: 'ap-1', name: 'Paket A', durationDays: 7, priceCents: 9900, active: true };

  beforeEach(() => {
    mockListUC = { execute: jest.fn().mockResolvedValue([samplePackage]) };
    mockCreateUC = { execute: jest.fn().mockResolvedValue(samplePackage) };
    mockUpdateUC = { execute: jest.fn().mockResolvedValue({ ...samplePackage, name: 'Güncel' }) };
    mockDeleteUC = { execute: jest.fn().mockResolvedValue({ deleted: true }) };
    controller = new AdminAdPackagesController(
      mockListUC as any,
      mockCreateUC as any,
      mockUpdateUC as any,
      mockDeleteUC as any,
    );
  });

  describe('list', () => {
    it('activeOnly=true ile aktif paketleri listeler', async () => {
      await controller.list('true');
      expect(mockListUC.execute).toHaveBeenCalledWith(true);
    });

    it('activeOnly=false ile tüm paketleri listeler', async () => {
      await controller.list('false');
      expect(mockListUC.execute).toHaveBeenCalledWith(false);
    });

    it('activeOnly yoksa varsayılan true kullanılır', async () => {
      await controller.list(undefined);
      expect(mockListUC.execute).toHaveBeenCalledWith(true);
    });

    it('paket listesini döndürür', async () => {
      const result = await controller.list();
      expect(result).toContainEqual(samplePackage);
    });
  });

  describe('create', () => {
    it('DTO alanlarını use case\'e iletir', async () => {
      const dto = { name: 'Yeni Paket', durationDays: 14, impressions: 1000, priceCents: 19900, currency: 'TRY', active: true } as any;
      await controller.create(dto);
      expect(mockCreateUC.execute).toHaveBeenCalledWith({
        name: 'Yeni Paket',
        durationDays: 14,
        impressions: 1000,
        priceCents: 19900,
        currency: 'TRY',
        active: true,
      });
    });
  });

  describe('update', () => {
    it('id ve DTO ile use case\'i çağırır', async () => {
      const dto = { name: 'Güncel Paket', active: false } as any;
      await controller.update('ap-1', dto);
      expect(mockUpdateUC.execute).toHaveBeenCalledWith('ap-1', expect.objectContaining({ name: 'Güncel Paket', active: false }));
    });
  });

  describe('delete', () => {
    it('id ile silme use case\'ini çağırır', async () => {
      await controller.delete('ap-1');
      expect(mockDeleteUC.execute).toHaveBeenCalledWith('ap-1');
    });
  });
});
