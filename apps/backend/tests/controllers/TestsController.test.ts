/**
 * TestsController unit testleri.
 */
import { TestsController } from '../../src/nest/controllers/tests.controller';

describe('TestsController', () => {
  let controller: TestsController;
  let mockCreateTestUC: { execute: jest.Mock };
  let mockCreateQuestionUC: { execute: jest.Mock };
  let mockGetUC: { execute: jest.Mock };
  let mockPublishUC: { execute: jest.Mock };
  let mockUnpublishUC: { execute: jest.Mock };
  let mockUpdateTestUC: { execute: jest.Mock };
  let mockUpdateQuestionUC: { execute: jest.Mock };
  let mockUpdateOptionUC: { execute: jest.Mock };
  let mockDeleteQuestionUC: { execute: jest.Mock };

  beforeEach(() => {
    mockCreateTestUC = { execute: jest.fn().mockResolvedValue({ id: 'test-1', title: 'Matematik' }) };
    mockCreateQuestionUC = { execute: jest.fn().mockResolvedValue({ id: 'q-1' }) };
    mockGetUC = { execute: jest.fn().mockResolvedValue({ id: 'test-1', title: 'Matematik', questions: [] }) };
    mockPublishUC = { execute: jest.fn().mockResolvedValue({ id: 'test-1', publishedAt: new Date() }) };
    mockUnpublishUC = { execute: jest.fn().mockResolvedValue({ id: 'test-1', publishedAt: null }) };
    mockUpdateTestUC = { execute: jest.fn().mockResolvedValue({ id: 'test-1', title: 'Güncel' }) };
    mockUpdateQuestionUC = { execute: jest.fn().mockResolvedValue({ id: 'q-1' }) };
    mockUpdateOptionUC = { execute: jest.fn().mockResolvedValue({ id: 'opt-1' }) };
    mockDeleteQuestionUC = { execute: jest.fn().mockResolvedValue({ deleted: true }) };

    controller = new TestsController(
      mockCreateTestUC as any,
      mockCreateQuestionUC as any,
      mockGetUC as any,
      mockPublishUC as any,
      mockUnpublishUC as any,
      mockUpdateTestUC as any,
      mockUpdateQuestionUC as any,
      mockUpdateOptionUC as any,
      mockDeleteQuestionUC as any,
    );
  });

  describe('createTest', () => {
    it('educatorId JWT\'den alınarak test oluşturur', async () => {
      const body = { title: 'Matematik', isTimed: true, duration: 60, price: 9900 } as any;
      const req = { user: { id: 'edu-1' } };
      const result = await controller.createTest(body, req as any);
      expect(mockCreateTestUC.execute).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Matematik', educatorId: 'edu-1' }),
      );
      expect(result).toHaveProperty('id', 'test-1');
    });

    it('examTypeId null olarak iletilir', async () => {
      const body = { title: 'Test', price: 0 } as any;
      const req = { user: { id: 'edu-1' } };
      await controller.createTest(body, req as any);
      expect(mockCreateTestUC.execute).toHaveBeenCalledWith(
        expect.objectContaining({ examTypeId: null }),
      );
    });
  });

  describe('publish', () => {
    it('testId ve actorId ile yayımlar', async () => {
      const req = { user: { id: 'edu-1' } };
      const result = await controller.publish('test-1', req as any);
      expect(mockPublishUC.execute).toHaveBeenCalledWith('test-1', 'edu-1');
      expect(result).toHaveProperty('publishedAt');
    });
  });

  describe('unpublish', () => {
    it('testId ve actorId ile yayımdan kaldırır', async () => {
      const req = { user: { id: 'edu-1' } };
      const result = await controller.unpublish('test-1', req as any);
      expect(mockUnpublishUC.execute).toHaveBeenCalledWith('test-1', 'edu-1');
      expect(result).toHaveProperty('publishedAt', null);
    });
  });

  describe('addQuestion', () => {
    it('testId ve question body ile soru ekler', async () => {
      const body = { content: 'Soru metni', choices: ['A', 'B', 'C', 'D'], correctIndex: 0 };
      const result = await controller.addQuestion('test-1', body);
      expect(mockCreateQuestionUC.execute).toHaveBeenCalledWith('test-1', body);
      expect(result).toHaveProperty('id', 'q-1');
    });
  });

  describe('updateTest', () => {
    it('test bilgilerini günceller', async () => {
      const body = { title: 'Güncel Başlık' } as any;
      const req = { user: { id: 'edu-1' } };
      const result = await controller.updateTest('test-1', body, req as any);
      expect(mockUpdateTestUC.execute).toHaveBeenCalledWith('test-1', expect.any(Object), 'edu-1');
      expect(result).toHaveProperty('title', 'Güncel');
    });
  });

  describe('updateQuestion', () => {
    it('soru içeriğini günceller', async () => {
      const body = { content: 'Yeni soru metni' } as any;
      const req = { user: { id: 'edu-1' } };
      await controller.updateQuestion('test-1', 'q-1', body, req as any);
      // Controller execute(questionId, bodyObj, actorId) olarak çağırır
      expect(mockUpdateQuestionUC.execute).toHaveBeenCalledWith('q-1', expect.any(Object), 'edu-1');
    });
  });

  describe('updateOption', () => {
    it('seçenek günceller', async () => {
      const body = { content: 'Yeni seçenek', isCorrect: false } as any;
      const req = { user: { id: 'edu-1' } };
      await controller.updateOption('test-1', 'q-1', 'opt-1', body, req as any);
      expect(mockUpdateOptionUC.execute).toHaveBeenCalledWith('opt-1', expect.any(Object), 'edu-1');
    });
  });

  describe('deleteQuestion', () => {
    it('soruyu siler', async () => {
      const req = { user: { id: 'edu-1' } };
      const result = await controller.deleteQuestion('test-1', 'q-1', req as any);
      // Controller execute(testId, questionId, actorId) olarak çağırır
      expect(mockDeleteQuestionUC.execute).toHaveBeenCalledWith('test-1', 'q-1', 'edu-1');
      expect(result).toEqual({ success: true });
    });
  });
});
