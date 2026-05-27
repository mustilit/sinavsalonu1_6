/**
 * GetModerationResultUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - ID bulunamazsa MODERATION_RESULT_NOT_FOUND fırlatır
 * - Başarılı çağrıda result, violation ve entitySnippet döner
 * - ExamQuestion tipi için snippet çekilir
 * - Violation yoksa null döner
 */

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    moderationResult: { findUnique: jest.fn() },
    moderationViolation: { findFirst: jest.fn() },
    examQuestion: { findUnique: jest.fn() },
  },
}));

import { GetModerationResultUseCase } from '../../../src/application/use-cases/moderation/GetModerationResultUseCase';
import { prisma } from '../../../src/infrastructure/database/prisma';

const mockPrisma = prisma as any;

const makeResult = (overrides: Record<string, unknown> = {}) => ({
  id: 'mr-1',
  tenantId: 'tenant-1',
  userId: 'edu-1',
  entityType: 'ExamQuestion',
  entityId: 'q-1',
  provider: 'OPENAI',
  status: 'APPROVED',
  score: 0.2,
  scores: {},
  categories: [],
  matchedTerms: [],
  flaggedContent: null,
  reasonText: null,
  reviewerNote: null,
  rawResponse: null,
  cost: null,
  latencyMs: 120,
  createdAt: new Date(),
  reviewedAt: null,
  ...overrides,
});

describe('GetModerationResultUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sonuç bulunamazsa MODERATION_RESULT_NOT_FOUND fırlatır', async () => {
    mockPrisma.moderationResult.findUnique.mockResolvedValue(null);
    const uc = new GetModerationResultUseCase();
    await expect(uc.execute('nonexistent')).rejects.toMatchObject({ code: 'MODERATION_RESULT_NOT_FOUND' });
  });

  it('ExamQuestion tipi için entitySnippet çekilir', async () => {
    mockPrisma.moderationResult.findUnique.mockResolvedValue(makeResult());
    mockPrisma.moderationViolation.findFirst.mockResolvedValue(null);
    mockPrisma.examQuestion.findUnique.mockResolvedValue({ content: 'Soru içeriği' });
    const uc = new GetModerationResultUseCase();
    const result = await uc.execute('mr-1');
    expect(result.entitySnippet).toBe('Soru içeriği');
  });

  it('violation yoksa null döner', async () => {
    mockPrisma.moderationResult.findUnique.mockResolvedValue(makeResult());
    mockPrisma.moderationViolation.findFirst.mockResolvedValue(null);
    mockPrisma.examQuestion.findUnique.mockResolvedValue(null);
    const uc = new GetModerationResultUseCase();
    const result = await uc.execute('mr-1');
    expect(result.violation).toBeNull();
  });

  it('violation varsa döner', async () => {
    const violation = { id: 'v-1', category: 'HATE_SPEECH', severity: 'HIGH', status: 'OPEN' };
    mockPrisma.moderationResult.findUnique.mockResolvedValue(makeResult());
    mockPrisma.moderationViolation.findFirst.mockResolvedValue(violation);
    mockPrisma.examQuestion.findUnique.mockResolvedValue(null);
    const uc = new GetModerationResultUseCase();
    const result = await uc.execute('mr-1');
    expect(result.violation).toEqual(violation);
  });

  it('ExamQuestion dışı entityType için snippet null olur', async () => {
    mockPrisma.moderationResult.findUnique.mockResolvedValue(makeResult({ entityType: 'User' }));
    mockPrisma.moderationViolation.findFirst.mockResolvedValue(null);
    const uc = new GetModerationResultUseCase();
    const result = await uc.execute('mr-1');
    expect(result.entitySnippet).toBeNull();
    expect(mockPrisma.examQuestion.findUnique).not.toHaveBeenCalled();
  });
});
