import { SendWeeklyFollowDigestUseCase } from '../../src/application/use-cases/SendWeeklyFollowDigestUseCase';

test('weekly digest enqueues emails', async () => {
  const followRepo = { listFollowersForEducator: async () => ['u1'], listFollowersForExamType: async () => [] };
  const prefRepo = { findByUserId: async () => ({ id: 'np1', userId: 'u1', emailEnabled: true, unsubscribeToken: 't' }) };
  const queueService = { enqueueEmail: jest.fn().mockResolvedValue(true) };
  const auditRepo = { create: jest.fn().mockResolvedValue(true) };
  const uc = new SendWeeklyFollowDigestUseCase(followRepo as any, prefRepo as any, queueService as any, auditRepo as any);
  const res = await uc.execute();
  expect(res).toHaveProperty('enqueued');
  expect(queueService.enqueueEmail).toHaveBeenCalled();
});

