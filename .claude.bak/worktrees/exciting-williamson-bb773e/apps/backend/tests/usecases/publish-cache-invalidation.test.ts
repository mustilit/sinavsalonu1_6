import { PublishTestUseCase } from '../../src/application/use-cases/PublishTestUseCase';

test('publish invalidates follower caches', async () => {
  const exam = { id: 't1', title: 'T', educatorId: 'e1', examTypeId: 'et1', questions: Array(5).fill({ id: 'q' }) };
  const examRepo: any = { findById: async () => exam, publish: async () => exam };
  const auditRepo: any = { create: jest.fn() };
  const approvedEducator = { id: 'e1', role: 'EDUCATOR', status: 'ACTIVE', educatorApprovedAt: new Date() };
  const userRepo: any = { findById: async (id: string) => (id === 'e1' ? approvedEducator : null) };
  const followRepo: any = {
    listFollowersForEducator: async () => ['c1', 'c2'],
    listFollowersForExamType: async () => ['c2', 'c3'],
  };
  const cache = { delByPrefix: jest.fn().mockResolvedValue(1) };
  const uc = new PublishTestUseCase(examRepo, auditRepo, userRepo, followRepo, cache);
  const res = await uc.execute('t1', 'e1');
  expect(res).toBeDefined();
  expect(cache.delByPrefix).toHaveBeenCalled();
  const calledKeys = cache.delByPrefix.mock.calls.map((c: any)=>c[0]);
  expect(calledKeys).toEqual(expect.arrayContaining([expect.stringContaining('home:rec:c1:'), expect.stringContaining('home:rec:c2:'), expect.stringContaining('home:rec:c3:')]));
});

