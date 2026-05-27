/**
 * UpdateOptionUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - actorId geçerliyse kullanıcı doğrulanır
 * - Kullanıcı bulunamazsa USER_NOT_FOUND fırlatır
 * - Option bulunamazsa OPTION_NOT_FOUND fırlatır
 * - Test bulunamazsa TEST_NOT_FOUND fırlatır
 * - Başka eğiticinin testi değiştirilemez (FORBIDDEN_NOT_OWNER)
 * - Başarılı güncellemede updateOption çağrılır
 */

import { UpdateOptionUseCase } from '../../../src/application/use-cases/question/UpdateOptionUseCase';

jest.mock('../../../src/application/policies/ensureEducatorActive', () => ({
  ensureEducatorActive: jest.fn(),
}));

function makeUserRepo(user: Record<string, unknown> | null = { id: 'edu-1', role: 'EDUCATOR', status: 'ACTIVE' }) {
  return { findById: jest.fn().mockResolvedValue(user) };
}

function makeExamRepo(option: Record<string, unknown> | null, test: Record<string, unknown> | null) {
  return {
    findOptionById: jest.fn().mockResolvedValue(option),
    findById: jest.fn().mockResolvedValue(test),
    updateOption: jest.fn().mockResolvedValue({ id: 'opt-1', content: 'Updated', isCorrect: false }),
  };
}

const makeOption = () => ({ id: 'opt-1', testId: 'test-1', content: 'Old', isCorrect: false });
const makeTest = (educatorId = 'edu-1') => ({ id: 'test-1', educatorId });

describe('UpdateOptionUseCase', () => {
  it('option bulunamazsa OPTION_NOT_FOUND fırlatır', async () => {
    const uc = new UpdateOptionUseCase(makeExamRepo(null, null) as any, makeUserRepo() as any, {} as any);
    await expect(uc.execute('opt-x', { content: 'New' })).rejects.toMatchObject({ code: 'OPTION_NOT_FOUND' });
  });

  it('test bulunamazsa TEST_NOT_FOUND fırlatır', async () => {
    const uc = new UpdateOptionUseCase(makeExamRepo(makeOption(), null) as any, makeUserRepo() as any, {} as any);
    await expect(uc.execute('opt-1', { content: 'New' })).rejects.toMatchObject({ code: 'TEST_NOT_FOUND' });
  });

  it('actorId ile başka eğiticinin option\'ı FORBIDDEN_NOT_OWNER fırlatır', async () => {
    const examRepo = makeExamRepo(makeOption(), makeTest('other-edu'));
    const userRepo = makeUserRepo({ id: 'edu-1', role: 'EDUCATOR', status: 'ACTIVE' });
    const uc = new UpdateOptionUseCase(examRepo as any, userRepo as any, {} as any);
    await expect(uc.execute('opt-1', { content: 'New' }, 'edu-1')).rejects.toMatchObject({ code: 'FORBIDDEN_NOT_OWNER' });
  });

  it('actorId geçerliyse updateOption çağrılır', async () => {
    const examRepo = makeExamRepo(makeOption(), makeTest('edu-1'));
    const userRepo = makeUserRepo({ id: 'edu-1', role: 'EDUCATOR', status: 'ACTIVE' });
    const uc = new UpdateOptionUseCase(examRepo as any, userRepo as any, {} as any);
    await uc.execute('opt-1', { content: 'Updated' }, 'edu-1');
    expect(examRepo.updateOption).toHaveBeenCalledWith('opt-1', { content: 'Updated' });
  });

  it('actorId olmadan herkes güncelleyebilir', async () => {
    const examRepo = makeExamRepo(makeOption(), makeTest('edu-1'));
    const userRepo = makeUserRepo();
    const uc = new UpdateOptionUseCase(examRepo as any, userRepo as any, {} as any);
    await uc.execute('opt-1', { isCorrect: true });
    expect(examRepo.updateOption).toHaveBeenCalled();
    expect(userRepo.findById).not.toHaveBeenCalled();
  });

  it('kullanıcı bulunamazsa USER_NOT_FOUND fırlatır', async () => {
    const examRepo = makeExamRepo(makeOption(), makeTest('edu-1'));
    const userRepo = makeUserRepo(null);
    const uc = new UpdateOptionUseCase(examRepo as any, userRepo as any, {} as any);
    await expect(uc.execute('opt-1', { content: 'New' }, 'nonexistent')).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
  });
});
