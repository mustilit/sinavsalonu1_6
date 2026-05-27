/**
 * RevokeModerationActionUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - Aksiyon bulunamazsa → ACTION_NOT_FOUND
 * - Farklı tenant → FORBIDDEN
 * - ACCOUNT_SUSPENDED → User.suspendedUntil null yapılır
 * - ACCOUNT_BANNED → User.isBanned=false yapılır
 * - WARN → user güncellenmez
 * - Her senaryoda audit moderationAction.create çağrılır
 */

const mockTransaction = jest.fn();
const mockUserUpdate = jest.fn();
const mockModerationActionCreate = jest.fn();

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    $transaction: (...args: any[]) => mockTransaction(...args),
  },
}));

import { RevokeModerationActionUseCase } from '../../../src/application/use-cases/moderation/RevokeModerationActionUseCase';
import { AppError } from '../../../src/application/errors/AppError';

function makeTx() {
  return {
    user: { update: (...args: any[]) => mockUserUpdate(...args) },
    moderationAction: { create: (...args: any[]) => mockModerationActionCreate(...args) },
  };
}

function makeActionRepo(action: any) {
  return {
    findById: jest.fn().mockResolvedValue(action),
  };
}

const PARAMS = { actionId: 'act-1', actorId: 'admin-1', tenantId: 't1' };

describe('RevokeModerationActionUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const tx = makeTx();
    mockTransaction.mockImplementation(async (cb: any) => cb(tx));
    mockUserUpdate.mockResolvedValue({});
    mockModerationActionCreate.mockResolvedValue({});
  });

  it('aksiyon bulunamazsa ACTION_NOT_FOUND fırlatır', async () => {
    const actionRepo = makeActionRepo(null);
    const uc = new RevokeModerationActionUseCase(actionRepo as any);
    await expect(uc.execute(PARAMS)).rejects.toMatchObject({ code: 'ACTION_NOT_FOUND' });
  });

  it('farklı tenant → FORBIDDEN fırlatır', async () => {
    const action = { id: 'act-1', tenantId: 'other-tenant', userId: 'edu-1', actionType: 'WARN' };
    const actionRepo = makeActionRepo(action);
    const uc = new RevokeModerationActionUseCase(actionRepo as any);
    await expect(uc.execute(PARAMS)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('ACCOUNT_SUSPENDED → User.suspendedUntil null yapılır', async () => {
    const action = { id: 'act-1', tenantId: 't1', userId: 'edu-1', actionType: 'ACCOUNT_SUSPENDED' };
    const actionRepo = makeActionRepo(action);
    const uc = new RevokeModerationActionUseCase(actionRepo as any);

    await uc.execute(PARAMS);

    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ suspendedUntil: null }) }),
    );
  });

  it('ACCOUNT_BANNED → User.isBanned=false yapılır', async () => {
    const action = { id: 'act-1', tenantId: 't1', userId: 'edu-1', actionType: 'ACCOUNT_BANNED' };
    const actionRepo = makeActionRepo(action);
    const uc = new RevokeModerationActionUseCase(actionRepo as any);

    await uc.execute(PARAMS);

    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isBanned: false }) }),
    );
  });

  it('WARN aksiyon → user.update çağrılmaz', async () => {
    const action = { id: 'act-1', tenantId: 't1', userId: 'edu-1', actionType: 'WARN' };
    const actionRepo = makeActionRepo(action);
    const uc = new RevokeModerationActionUseCase(actionRepo as any);

    await uc.execute(PARAMS);

    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('her senaryoda audit moderationAction.create çağrılır', async () => {
    const action = { id: 'act-1', tenantId: 't1', userId: 'edu-1', actionType: 'CONTENT_REMOVED' };
    const actionRepo = makeActionRepo(action);
    const uc = new RevokeModerationActionUseCase(actionRepo as any);

    await uc.execute(PARAMS);

    expect(mockModerationActionCreate).toHaveBeenCalledTimes(1);
    expect(mockModerationActionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({ revokedActionId: 'act-1' }),
        }),
      }),
    );
  });
});
