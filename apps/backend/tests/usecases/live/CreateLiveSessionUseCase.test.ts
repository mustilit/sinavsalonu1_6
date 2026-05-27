/**
 * CreateLiveSessionUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - Educator bulunamazsa → USER_NOT_FOUND
 * - CANDIDATE rolü → FORBIDDEN
 * - Educator aktif değilse → EDUCATOR_NOT_ACTIVE
 * - Başlık boşsa → VALIDATION_ERROR
 * - Soru yoksa → VALIDATION_ERROR
 * - Soru content ve media ikisi de boşsa → VALIDATION_ERROR
 * - Seçenek < 2 ise → VALIDATION_ERROR
 * - Hiç doğru seçenek yoksa → VALIDATION_ERROR
 * - maxLive sınırı aşılırsa → LIVE_QUESTION_LIMIT_EXCEEDED
 * - Tier bulunamazsa / inactive → TIER_NOT_FOUND
 * - Başarı: liveSession.create çağrılır
 */

const mockUserFindUnique = jest.fn();
const mockAdminSettingsFindFirst = jest.fn();
const mockLiveSessionTierFindUnique = jest.fn();
const mockLiveSessionFindUnique = jest.fn();
const mockLiveSessionCreate = jest.fn();

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    user: { findUnique: (...args: any[]) => mockUserFindUnique(...args) },
    adminSettings: { findFirst: (...args: any[]) => mockAdminSettingsFindFirst(...args) },
    liveSessionTier: { findUnique: (...args: any[]) => mockLiveSessionTierFindUnique(...args) },
    liveSession: {
      findUnique: (...args: any[]) => mockLiveSessionFindUnique(...args),
      create: (...args: any[]) => mockLiveSessionCreate(...args),
    },
  },
}));

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreateLiveSessionUseCase } from '../../../src/application/use-cases/live/CreateLiveSessionUseCase';
import { AppError } from '../../../src/application/errors/AppError';

function makeQuestion(overrides: Record<string, any> = {}) {
  return {
    content: 'Türkiye nin başkenti neresidir?',
    order: 1,
    options: [
      { content: 'Ankara', isCorrect: true, order: 1 },
      { content: 'İstanbul', isCorrect: false, order: 2 },
    ],
    ...overrides,
  };
}

const BASE_INPUT = {
  educatorId: 'edu-1',
  title: 'KPSS Canlı',
  questions: [makeQuestion()],
};

describe('CreateLiveSessionUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserFindUnique.mockResolvedValue({ id: 'edu-1', role: 'EDUCATOR', status: 'ACTIVE' });
    mockAdminSettingsFindFirst.mockResolvedValue({ maxLiveQuestions: 50 });
    mockLiveSessionFindUnique.mockResolvedValue(null); // kod müsait
    mockLiveSessionCreate.mockResolvedValue({ id: 'sess-new', joinCode: 'ABC123', status: 'DRAFT' });
  });

  it('educator bulunamazsa USER_NOT_FOUND fırlatır', async () => {
    mockUserFindUnique.mockResolvedValue(null);
    const uc = new CreateLiveSessionUseCase();
    await expect(uc.execute(BASE_INPUT)).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
  });

  it('CANDIDATE rolü → FORBIDDEN fırlatır', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'cand-1', role: 'CANDIDATE', status: 'ACTIVE' });
    const uc = new CreateLiveSessionUseCase();
    await expect(uc.execute({ ...BASE_INPUT, educatorId: 'cand-1' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('educator SUSPENDED → EDUCATOR_NOT_ACTIVE fırlatır', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'edu-1', role: 'EDUCATOR', status: 'SUSPENDED' });
    const uc = new CreateLiveSessionUseCase();
    await expect(uc.execute(BASE_INPUT)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('başlık boşsa VALIDATION_ERROR fırlatır', async () => {
    const uc = new CreateLiveSessionUseCase();
    await expect(uc.execute({ ...BASE_INPUT, title: '   ' })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('soru yoksa VALIDATION_ERROR fırlatır', async () => {
    const uc = new CreateLiveSessionUseCase();
    await expect(uc.execute({ ...BASE_INPUT, questions: [] })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('soru content ve media boşsa VALIDATION_ERROR', async () => {
    const uc = new CreateLiveSessionUseCase();
    await expect(
      uc.execute({
        ...BASE_INPUT,
        questions: [makeQuestion({ content: '', mediaUrl: null })],
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('seçenek sayısı < 2 → VALIDATION_ERROR', async () => {
    const uc = new CreateLiveSessionUseCase();
    await expect(
      uc.execute({
        ...BASE_INPUT,
        questions: [makeQuestion({ options: [{ content: 'Tek', isCorrect: true, order: 1 }] })],
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('doğru seçenek yoksa VALIDATION_ERROR', async () => {
    const uc = new CreateLiveSessionUseCase();
    await expect(
      uc.execute({
        ...BASE_INPUT,
        questions: [makeQuestion({ options: [
          { content: 'A', isCorrect: false, order: 1 },
          { content: 'B', isCorrect: false, order: 2 },
        ]})],
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('maxLive sınırı aşılırsa LIVE_QUESTION_LIMIT_EXCEEDED', async () => {
    mockAdminSettingsFindFirst.mockResolvedValue({ maxLiveQuestions: 1 });
    const uc = new CreateLiveSessionUseCase();
    await expect(
      uc.execute({
        ...BASE_INPUT,
        questions: [makeQuestion(), makeQuestion({ order: 2 })],
      }),
    ).rejects.toMatchObject({ code: 'LIVE_QUESTION_LIMIT_EXCEEDED' });
  });

  it('tier bulunamazsa TIER_NOT_FOUND', async () => {
    mockLiveSessionTierFindUnique.mockResolvedValue(null);
    const uc = new CreateLiveSessionUseCase();
    await expect(uc.execute({ ...BASE_INPUT, tierId: 'tier-missing' })).rejects.toMatchObject({
      code: 'TIER_NOT_FOUND',
    });
  });

  it('tier inactive ise TIER_NOT_FOUND', async () => {
    mockLiveSessionTierFindUnique.mockResolvedValue({ id: 'tier-1', isActive: false, maxParticipants: 50 });
    const uc = new CreateLiveSessionUseCase();
    await expect(uc.execute({ ...BASE_INPUT, tierId: 'tier-1' })).rejects.toMatchObject({
      code: 'TIER_NOT_FOUND',
    });
  });

  it('başarı: liveSession.create çağrılır, status DRAFT döner', async () => {
    const uc = new CreateLiveSessionUseCase();
    const result = await uc.execute(BASE_INPUT);
    expect(mockLiveSessionCreate).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('DRAFT');
  });
});
