/**
 * DraftsController unit testleri.
 */

jest.mock('../../src/infrastructure/database/prisma', () => ({
  prisma: {
    draft: {
      findUnique: jest.fn().mockResolvedValue({ key: 'createTestWizard', payload: { step: 1 } }),
      upsert: jest.fn().mockResolvedValue({ key: 'createTestWizard', payload: { step: 2 } }),
      delete: jest.fn().mockResolvedValue({ key: 'createTestWizard' }),
    },
  },
}));

const mockUpsert = jest.fn().mockResolvedValue({ key: 'createTestWizard', payload: { step: 2 } });
const mockGetDraft = jest.fn().mockResolvedValue({ key: 'createTestWizard', payload: { step: 1 } });
const mockDelete = jest.fn().mockResolvedValue({ deleted: true });

jest.mock('../../src/application/use-cases/draft/UpsertDraftUseCase', () => ({
  UpsertDraftUseCase: jest.fn().mockImplementation(() => ({ execute: mockUpsert })),
}));
jest.mock('../../src/application/use-cases/draft/GetDraftUseCase', () => ({
  GetDraftUseCase: jest.fn().mockImplementation(() => ({ execute: mockGetDraft })),
}));
jest.mock('../../src/application/use-cases/draft/DeleteDraftUseCase', () => ({
  DeleteDraftUseCase: jest.fn().mockImplementation(() => ({ execute: mockDelete })),
}));

import { DraftsController } from '../../src/nest/controllers/drafts.controller';

describe('DraftsController', () => {
  let controller: DraftsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new DraftsController();
  });

  describe('get', () => {
    it('ownerId ve key ile draft\'ı getirir', async () => {
      const req = { user: { id: 'cand-1' } };
      const result = await controller.get(req as any, 'createTestWizard');
      expect(mockGetDraft).toHaveBeenCalledWith('cand-1', 'createTestWizard');
      expect(result).toHaveProperty('key', 'createTestWizard');
    });

    it('URL-encoded key decode\'lanır', async () => {
      const req = { user: { id: 'cand-1' } };
      await controller.get(req as any, 'editTestWizard%3Aabc123');
      expect(mockGetDraft).toHaveBeenCalledWith('cand-1', 'editTestWizard:abc123');
    });

    it('draft yoksa null döner', async () => {
      mockGetDraft.mockResolvedValueOnce(null);
      const req = { user: { id: 'cand-1' } };
      const result = await controller.get(req as any, 'nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('upsert', () => {
    it('draft kaydeder veya günceller', async () => {
      const req = { user: { id: 'cand-1' } };
      const dto = { payload: { step: 2, data: { title: 'Test' } } } as any;
      const result = await controller.upsert(req as any, 'createTestWizard', dto);
      expect(mockUpsert).toHaveBeenCalledWith('cand-1', 'createTestWizard', { step: 2, data: { title: 'Test' } });
      expect(result).toHaveProperty('key');
    });
  });

  describe('delete', () => {
    it('draft\'ı siler', async () => {
      const req = { user: { id: 'cand-1' } };
      await controller.delete(req as any, 'createTestWizard');
      expect(mockDelete).toHaveBeenCalledWith('cand-1', 'createTestWizard');
    });
  });
});
