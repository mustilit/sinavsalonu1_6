/**
 * PackagesController unit testleri.
 */
import { PackagesController } from '../../src/nest/controllers/packages.controller';

describe('PackagesController', () => {
  let controller: PackagesController;
  let mockCreateUC: { execute: jest.Mock };
  let mockGetUC: { execute: jest.Mock };
  let mockListUC: { execute: jest.Mock };
  let mockUpdateUC: { execute: jest.Mock };
  let mockAddTestUC: { execute: jest.Mock };
  let mockRemoveTestUC: { execute: jest.Mock };
  let mockPublishUC: { execute: jest.Mock };
  let mockUnpublishUC: { execute: jest.Mock };

  const pkg = { id: 'pkg-1', title: 'Paket A', priceCents: 9900 };

  beforeEach(() => {
    mockCreateUC = { execute: jest.fn().mockResolvedValue(pkg) };
    mockGetUC = { execute: jest.fn().mockResolvedValue({ ...pkg, tests: [] }) };
    mockListUC = { execute: jest.fn().mockResolvedValue([pkg]) };
    mockUpdateUC = { execute: jest.fn().mockResolvedValue({ ...pkg, title: 'Güncel' }) };
    mockAddTestUC = { execute: jest.fn().mockResolvedValue({ added: true }) };
    mockRemoveTestUC = { execute: jest.fn().mockResolvedValue({ removed: true }) };
    mockPublishUC = { execute: jest.fn().mockResolvedValue({ ...pkg, publishedAt: new Date() }) };
    mockUnpublishUC = { execute: jest.fn().mockResolvedValue({ ...pkg, publishedAt: null }) };

    controller = new PackagesController(
      mockCreateUC as any,
      mockGetUC as any,
      mockListUC as any,
      mockUpdateUC as any,
      mockAddTestUC as any,
      mockRemoveTestUC as any,
      mockPublishUC as any,
      mockUnpublishUC as any,
    );
  });

  describe('list', () => {
    it('educatorId JWT\'den alınarak paketleri listeler', async () => {
      const req = { user: { id: 'edu-1' } };
      const result = await controller.list(req as any);
      expect(mockListUC.execute).toHaveBeenCalledWith('edu-1');
      expect(result).toContainEqual(pkg);
    });
  });

  describe('create', () => {
    it('educatorId ve DTO ile paket oluşturur', async () => {
      const req = { user: { id: 'edu-1' } };
      const dto = { title: 'Paket A', priceCents: 9900, difficulty: 'MEDIUM' } as any;
      const result = await controller.create(req as any, dto);
      expect(mockCreateUC.execute).toHaveBeenCalledWith('edu-1', expect.objectContaining({ title: 'Paket A', priceCents: 9900 }));
      expect(result).toHaveProperty('id', 'pkg-1');
    });

    it('description yoksa null iletilir', async () => {
      const req = { user: { id: 'edu-1' } };
      const dto = { title: 'Paket B', priceCents: 5000 } as any;
      await controller.create(req as any, dto);
      expect(mockCreateUC.execute).toHaveBeenCalledWith('edu-1', expect.objectContaining({ description: null }));
    });
  });

  describe('findOne', () => {
    it('id ve educatorId ile paketi getirir', async () => {
      const req = { user: { id: 'edu-1' } };
      const result = await controller.findOne(req as any, 'pkg-1');
      expect(mockGetUC.execute).toHaveBeenCalledWith('pkg-1', 'edu-1');
      expect(result).toHaveProperty('tests');
    });
  });

  describe('update', () => {
    it('paket bilgilerini günceller', async () => {
      const req = { user: { id: 'edu-1' } };
      const dto = { title: 'Güncel Paket' } as any;
      const result = await controller.update(req as any, 'pkg-1', dto);
      expect(mockUpdateUC.execute).toHaveBeenCalledWith('pkg-1', 'edu-1', expect.any(Object));
      expect(result).toHaveProperty('title', 'Güncel');
    });
  });

  describe('addTest', () => {
    it('pakete test ekler', async () => {
      const req = { user: { id: 'edu-1' } };
      const dto = { testId: 'test-1' } as any;
      await controller.addTest(req as any, 'pkg-1', dto);
      // execute(packageId, educatorId, testId) sırası
      expect(mockAddTestUC.execute).toHaveBeenCalledWith('pkg-1', 'edu-1', 'test-1');
    });
  });

  describe('removeTest', () => {
    it('paketten test kaldırır', async () => {
      const req = { user: { id: 'edu-1' } };
      await controller.removeTest(req as any, 'pkg-1', 'test-1');
      // execute(packageId, educatorId, testId) sırası
      expect(mockRemoveTestUC.execute).toHaveBeenCalledWith('pkg-1', 'edu-1', 'test-1');
    });
  });

  describe('publish', () => {
    it('paketi yayımlar', async () => {
      const req = { user: { id: 'edu-1' } };
      const result = await controller.publish(req as any, 'pkg-1');
      expect(mockPublishUC.execute).toHaveBeenCalledWith('pkg-1', 'edu-1');
      expect(result).toHaveProperty('publishedAt');
    });
  });

  describe('unpublish', () => {
    it('paketi yayımdan kaldırır', async () => {
      const req = { user: { id: 'edu-1' } };
      const result = await controller.unpublish(req as any, 'pkg-1');
      expect(mockUnpublishUC.execute).toHaveBeenCalledWith('pkg-1', 'edu-1');
      expect(result).toHaveProperty('publishedAt', null);
    });
  });
});
