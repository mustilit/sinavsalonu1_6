/**
 * RetryFailedEmailUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - EmailLog bulunamazsa 404 fırlatır
 * - SENT durumundaki mail retry edilemez (400)
 * - FAILED durumundaki mail QUEUED'a alınır
 * - DEAD_LETTER durumundaki mail retry edilir
 * - Producer enqueue çağrılır
 * - AuditLog yazılır
 */

const mockDb = {
  emailLog: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  emailEvent: { create: jest.fn() },
  auditLog: { create: jest.fn() },
};

const mockProducer = {
  enqueue: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: mockDb,
}));

jest.mock('../../../src/application/services/email/EmailQueueProducer', () => ({
  getEmailQueueProducer: () => mockProducer,
}));

import { RetryFailedEmailUseCase } from '../../../src/application/use-cases/email/RetryFailedEmailUseCase';

const makeLog = (status: string) => ({
  id: 'log-1',
  tenantId: 'tenant-1',
  status,
  queue: 'email-critical',
  templateKey: 'password-reset',
});

describe('RetryFailedEmailUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('EmailLog bulunamazsa 404 fırlatır', async () => {
    mockDb.emailLog.findFirst.mockResolvedValue(null);
    const uc = new RetryFailedEmailUseCase(mockDb as any, mockProducer as any);
    await expect(uc.execute({ tenantId: 'tenant-1', emailLogId: 'log-x', actorId: 'admin-1' }))
      .rejects.toMatchObject({ status: 404 });
  });

  it('SENT durumundaki mail retry edilemez', async () => {
    mockDb.emailLog.findFirst.mockResolvedValue(makeLog('SENT'));
    const uc = new RetryFailedEmailUseCase(mockDb as any, mockProducer as any);
    await expect(uc.execute({ tenantId: 'tenant-1', emailLogId: 'log-1', actorId: 'admin-1' }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('FAILED durumundaki mail QUEUED\'a alınır', async () => {
    mockDb.emailLog.findFirst.mockResolvedValue(makeLog('FAILED'));
    mockDb.emailLog.update.mockResolvedValue({ ...makeLog('QUEUED') });
    mockDb.emailEvent.create.mockResolvedValue({});
    mockDb.auditLog.create.mockResolvedValue({});
    const uc = new RetryFailedEmailUseCase(mockDb as any, mockProducer as any);
    await uc.execute({ tenantId: 'tenant-1', emailLogId: 'log-1', actorId: 'admin-1' });
    expect(mockDb.emailLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'QUEUED' }),
      }),
    );
  });

  it('DEAD_LETTER durumundaki mail retry edilir', async () => {
    mockDb.emailLog.findFirst.mockResolvedValue(makeLog('DEAD_LETTER'));
    mockDb.emailLog.update.mockResolvedValue({ ...makeLog('QUEUED') });
    mockDb.emailEvent.create.mockResolvedValue({});
    mockDb.auditLog.create.mockResolvedValue({});
    const uc = new RetryFailedEmailUseCase(mockDb as any, mockProducer as any);
    await uc.execute({ tenantId: 'tenant-1', emailLogId: 'log-1', actorId: 'admin-1' });
    expect(mockProducer.enqueue).toHaveBeenCalled();
  });

  it('AuditLog EMAIL_RETRY_TRIGGERED action ile yazılır', async () => {
    mockDb.emailLog.findFirst.mockResolvedValue(makeLog('FAILED'));
    mockDb.emailLog.update.mockResolvedValue({ ...makeLog('QUEUED') });
    mockDb.emailEvent.create.mockResolvedValue({});
    mockDb.auditLog.create.mockResolvedValue({});
    const uc = new RetryFailedEmailUseCase(mockDb as any, mockProducer as any);
    await uc.execute({ tenantId: 'tenant-1', emailLogId: 'log-1', actorId: 'admin-1' });
    expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'EMAIL_RETRY_TRIGGERED' }),
      }),
    );
  });
});
