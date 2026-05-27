/**
 * AdminTopicsController unit testleri.
 */
import { AdminTopicsController } from '../../../src/nest/controllers/admin.topics.controller';

describe('AdminTopicsController', () => {
  let controller: AdminTopicsController;
  let mockCreateTopic: { execute: jest.Mock };
  let mockUpdateTopic: { execute: jest.Mock };
  let mockDeleteTopic: { execute: jest.Mock };
  let mockTopicTree: { execute: jest.Mock };
  let mockListTopics: { execute: jest.Mock };

  const topic = { id: 'tp-1', name: 'Matematik', active: true };

  beforeEach(() => {
    mockCreateTopic = { execute: jest.fn().mockResolvedValue(topic) };
    mockUpdateTopic = { execute: jest.fn().mockResolvedValue({ ...topic, name: 'Güncellendi' }) };
    mockDeleteTopic = { execute: jest.fn().mockResolvedValue({ deleted: true }) };
    mockTopicTree = { execute: jest.fn().mockResolvedValue([{ ...topic, children: [] }]) };
    mockListTopics = { execute: jest.fn().mockResolvedValue([topic]) };

    controller = new AdminTopicsController(
      mockCreateTopic as any,
      mockUpdateTopic as any,
      mockDeleteTopic as any,
      mockTopicTree as any,
      mockListTopics as any,
    );
  });

  describe('tree', () => {
    it('tam konu ağacını döndürür', () => {
      const result = controller.tree();
      expect(mockTopicTree.execute).toHaveBeenCalledWith(false);
    });
  });

  describe('list', () => {
    it('examTypeId filtresiyle listeler', () => {
      controller.list('et-1', undefined);
      expect(mockListTopics.execute).toHaveBeenCalledWith('et-1', true);
    });

    it('activeOnly=false ile pasif konular da listelenir', () => {
      controller.list(undefined, 'false');
      expect(mockListTopics.execute).toHaveBeenCalledWith(undefined, false);
    });

    it('examTypeId yoksa undefined iletilir', () => {
      controller.list(undefined, undefined);
      expect(mockListTopics.execute).toHaveBeenCalledWith(undefined, true);
    });
  });

  describe('create', () => {
    it('yeni konu oluşturur', () => {
      const body = { name: 'Matematik', examTypeIds: ['et-1'], parentId: null, active: true } as any;
      const req = { user: { id: 'admin-1' } };
      const result = controller.create(body, req as any);
      expect(mockCreateTopic.execute).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Matematik', examTypeIds: ['et-1'] }),
        'admin-1',
      );
    });
  });

  describe('update', () => {
    it('konuyu günceller', () => {
      const body = { name: 'Güncellendi' } as any;
      const req = { user: { id: 'admin-1' } };
      controller.update('tp-1', body, req as any);
      expect(mockUpdateTopic.execute).toHaveBeenCalledWith(
        'tp-1',
        expect.objectContaining({ name: 'Güncellendi' }),
        'admin-1',
      );
    });
  });

  describe('delete', () => {
    it('konuyu siler', () => {
      const req = { user: { id: 'admin-1' } };
      controller.delete('tp-1', req as any);
      expect(mockDeleteTopic.execute).toHaveBeenCalledWith('tp-1', 'admin-1');
    });
  });
});
