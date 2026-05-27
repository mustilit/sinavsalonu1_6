/**
 * SendBulkCandidateEmailUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - Konu veya gövde boşsa INVALID_INPUT fırlatır
 * - candidateIds boşsa INVALID_INPUT fırlatır
 * - 500'den fazla alıcıda TOO_MANY_RECIPIENTS fırlatır
 * - Başarılı gönderimde sent/failed sayımı doğru
 * - Email provider hatası failed sayacını artırır
 */

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
    },
  },
}));

import { SendBulkCandidateEmailUseCase } from '../../../src/application/use-cases/admin/SendBulkCandidateEmailUseCase';
import { prisma } from '../../../src/infrastructure/database/prisma';

const mockPrisma = prisma as any;

const makeEmailProvider = (shouldFail = false) => ({
  sendEmail: shouldFail
    ? jest.fn().mockRejectedValue(new Error('SMTP error'))
    : jest.fn().mockResolvedValue({ messageId: 'msg-1' }),
});

describe('SendBulkCandidateEmailUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'cand-1', email: 'a@test.com', username: 'a' },
      { id: 'cand-2', email: 'b@test.com', username: 'b' },
    ]);
  });

  it('konu boşsa INVALID_INPUT fırlatır', async () => {
    const provider = makeEmailProvider();
    const uc = new SendBulkCandidateEmailUseCase(provider as any);
    await expect(uc.execute({ candidateIds: ['id-1'], subject: '', body: 'test' }))
      .rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('body boşsa INVALID_INPUT fırlatır', async () => {
    const provider = makeEmailProvider();
    const uc = new SendBulkCandidateEmailUseCase(provider as any);
    await expect(uc.execute({ candidateIds: ['id-1'], subject: 'Konu', body: '' }))
      .rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('candidateIds boşsa INVALID_INPUT fırlatır', async () => {
    const provider = makeEmailProvider();
    const uc = new SendBulkCandidateEmailUseCase(provider as any);
    await expect(uc.execute({ candidateIds: [], subject: 'Konu', body: 'Mesaj' }))
      .rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('501 alıcıda TOO_MANY_RECIPIENTS fırlatır', async () => {
    const provider = makeEmailProvider();
    const uc = new SendBulkCandidateEmailUseCase(provider as any);
    const ids = Array.from({ length: 501 }, (_, i) => `id-${i}`);
    await expect(uc.execute({ candidateIds: ids, subject: 'Konu', body: 'Mesaj' }))
      .rejects.toMatchObject({ code: 'TOO_MANY_RECIPIENTS' });
  });

  it('2 kullanıcıya başarılı gönderimde sent:2 döner', async () => {
    const provider = makeEmailProvider();
    const uc = new SendBulkCandidateEmailUseCase(provider as any);
    const result = await uc.execute({
      candidateIds: ['cand-1', 'cand-2'],
      subject: 'Duyuru',
      body: 'İçerik',
    });
    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);
  });

  it('email provider hatası failed sayacını artırır', async () => {
    const provider = makeEmailProvider(true);
    const uc = new SendBulkCandidateEmailUseCase(provider as any);
    const result = await uc.execute({
      candidateIds: ['cand-1', 'cand-2'],
      subject: 'Duyuru',
      body: 'İçerik',
    });
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(2);
  });
});
