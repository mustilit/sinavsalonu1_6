/**
 * AdminModerationController unit testleri.
 */
import { AdminModerationController } from '../../../src/nest/controllers/admin.moderation.controller';

describe('AdminModerationController', () => {
  let controller: AdminModerationController;
  let mockListPending: { execute: jest.Mock };
  let mockGetResult: { execute: jest.Mock };
  let mockApprove: { execute: jest.Mock };
  let mockReject: { execute: jest.Mock };
  let mockListRisky: { execute: jest.Mock };
  let mockGetHistory: { execute: jest.Mock };
  let mockApplyAction: { execute: jest.Mock };
  let mockRevokeAction: { execute: jest.Mock };
  let mockListTerms: { execute: jest.Mock };
  let mockCreateTerm: { execute: jest.Mock };
  let mockUpdateTerm: { execute: jest.Mock };
  let mockDeleteTerm: { execute: jest.Mock };

  beforeEach(() => {
    mockListPending = { execute: jest.fn().mockResolvedValue({ items: [], nextCursor: null }) };
    mockGetResult = { execute: jest.fn().mockResolvedValue({ id: 'mr-1', status: 'PENDING' }) };
    mockApprove = { execute: jest.fn().mockResolvedValue(undefined) };
    mockReject = { execute: jest.fn().mockResolvedValue(undefined) };
    mockListRisky = { execute: jest.fn().mockResolvedValue({ items: [], nextCursor: null }) };
    mockGetHistory = { execute: jest.fn().mockResolvedValue({ items: [] }) };
    mockApplyAction = { execute: jest.fn().mockResolvedValue({ id: 'act-1' }) };
    mockRevokeAction = { execute: jest.fn().mockResolvedValue(undefined) };
    mockListTerms = { execute: jest.fn().mockResolvedValue({ items: [] }) };
    mockCreateTerm = { execute: jest.fn().mockResolvedValue({ id: 'term-1' }) };
    mockUpdateTerm = { execute: jest.fn().mockResolvedValue({ id: 'term-1' }) };
    mockDeleteTerm = { execute: jest.fn().mockResolvedValue(undefined) };

    controller = new AdminModerationController(
      mockListPending as any,
      mockGetResult as any,
      mockApprove as any,
      mockReject as any,
      mockListRisky as any,
      mockGetHistory as any,
      mockApplyAction as any,
      mockRevokeAction as any,
      mockListTerms as any,
      mockCreateTerm as any,
      mockUpdateTerm as any,
      mockDeleteTerm as any,
    );
  });

  describe('listQueue', () => {
    it('filtrelerle moderasyon kuyruğunu listeler', async () => {
      const q = { cursorId: 'mr-5', limit: 20, category: 'HATE_SPEECH', userId: 'u1' } as any;
      await controller.listQueue(q);
      expect(mockListPending.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: 'mr-5' },
          limit: 20,
          category: 'HATE_SPEECH',
          userId: 'u1',
        }),
      );
    });

    it('cursorId yoksa cursor undefined iletilir', async () => {
      await controller.listQueue({} as any);
      expect(mockListPending.execute).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: undefined }),
      );
    });
  });

  describe('getResult', () => {
    it('id ile moderasyon sonucunu getirir', async () => {
      const result = await controller.getResult('mr-1');
      expect(mockGetResult.execute).toHaveBeenCalledWith('mr-1');
      expect(result).toHaveProperty('status', 'PENDING');
    });
  });

  describe('approve', () => {
    it('resultId, reviewerId ve note ile onay verir', async () => {
      const dto = { reviewerNote: 'Uygun içerik' } as any;
      const req = { user: { id: 'admin-1' } };
      const result = await controller.approve('mr-1', dto, req as any);
      expect(mockApprove.execute).toHaveBeenCalledWith({
        resultId: 'mr-1',
        reviewerId: 'admin-1',
        reviewerNote: 'Uygun içerik',
      });
      expect(result).toEqual({ success: true });
    });

    it('not yoksa null iletilir', async () => {
      const dto = {} as any;
      const req = { user: { id: 'admin-1' } };
      await controller.approve('mr-1', dto, req as any);
      expect(mockApprove.execute).toHaveBeenCalledWith(
        expect.objectContaining({ reviewerNote: null }),
      );
    });
  });

  describe('reject', () => {
    it('resultId, reviewerId ve note ile reddeder', async () => {
      const dto = { reviewerNote: 'Kural ihlali' } as any;
      const req = { user: { id: 'admin-1' } };
      const result = await controller.reject('mr-1', dto, req as any);
      expect(mockReject.execute).toHaveBeenCalledWith({
        resultId: 'mr-1',
        reviewerId: 'admin-1',
        reviewerNote: 'Kural ihlali',
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('listRiskyEducators', () => {
    it('riskLevels ve tarih filtreleri iletilir', async () => {
      const q = { riskLevel: ['HIGH', 'CRITICAL'], cursorUserId: 'u-1', cursorScore: '85', limit: 10 } as any;
      await controller.listRiskyEducators(q);
      expect(mockListRisky.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          riskLevels: ['HIGH', 'CRITICAL'],
          cursor: { userId: 'u-1', computedScore: 85 },
          limit: 10,
        }),
      );
    });
  });

  describe('getEducatorViolations', () => {
    it('educatorId ile ihlal geçmişini getirir', async () => {
      await controller.getEducatorViolations('edu-1', 'v-5', '20');
      expect(mockGetHistory.execute).toHaveBeenCalledWith(
        expect.objectContaining({ educatorId: 'edu-1', cursor: { id: 'v-5' }, limit: 20 }),
      );
    });
  });

  describe('applyAction', () => {
    it('suspend aksiyonunu uygular', async () => {
      const dto = { actionType: 'SUSPEND', reason: 'İhlal', durationDays: 7 } as any;
      const req = { user: { id: 'admin-1' } };
      await controller.applyAction('edu-1', dto, req as any);
      expect(mockApplyAction.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'edu-1',
          actorId: 'admin-1',
          actionType: 'SUSPEND',
          durationDays: 7,
        }),
      );
    });
  });

  describe('revokeAction', () => {
    it('aksiyon id ile iptal eder', async () => {
      const req = { user: { id: 'admin-1' } };
      const result = await controller.revokeAction('act-1', req as any);
      expect(mockRevokeAction.execute).toHaveBeenCalledWith({
        actionId: 'act-1',
        actorId: 'admin-1',
        tenantId: expect.any(String),
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('blocked terms', () => {
    it('listBlockedTerms: filtrelerle listeler', async () => {
      const q = { cursorId: 't-5', limit: 30, category: 'OFFENSIVE', isActive: true } as any;
      await controller.listBlockedTerms(q);
      expect(mockListTerms.execute).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: { id: 't-5' }, category: 'OFFENSIVE' }),
      );
    });

    it('createBlockedTerm: DTO ve createdBy ile term oluşturur', async () => {
      const dto = { term: 'yasak kelime', category: 'OFFENSIVE', severity: 3, isActive: true } as any;
      const req = { user: { id: 'admin-1' } };
      await controller.createBlockedTerm(dto, req as any);
      expect(mockCreateTerm.execute).toHaveBeenCalledWith(
        expect.objectContaining({ term: 'yasak kelime', createdBy: 'admin-1' }),
      );
    });

    it('updateBlockedTerm: id ve DTO ile günceller', async () => {
      const dto = { isActive: false } as any;
      await controller.updateBlockedTerm('term-1', dto);
      expect(mockUpdateTerm.execute).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'term-1', isActive: false }),
      );
    });

    it('deleteBlockedTerm: id ile siler', async () => {
      const result = await controller.deleteBlockedTerm('term-1');
      expect(mockDeleteTerm.execute).toHaveBeenCalledWith('term-1', expect.any(String));
      expect(result).toEqual({ success: true });
    });
  });
});
