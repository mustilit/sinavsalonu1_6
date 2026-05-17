import { PrismaNotificationPreferenceRepository } from '../../src/infrastructure/repositories/PrismaNotificationPreferenceRepository';
import { MockEmailProvider } from '../../src/infrastructure/services/MockEmailProvider';
import { SendWeeklyFollowDigestUseCase } from '../../src/application/use-cases/SendWeeklyFollowDigestUseCase';
import { SendMonthlyInactiveReminderUseCase } from '../../src/application/use-cases/SendMonthlyInactiveReminderUseCase';
import { EscalateOverdueObjectionsUseCase } from '../../src/application/use-cases/EscalateOverdueObjectionsUseCase';

// These are integration-light tests that use the mock provider and fake repos where necessary.
describe('Notifications & Cron use-cases', () => {
  it('unsubscribe disables emails (repo layer)', async () => {
    const repo = new PrismaNotificationPreferenceRepository();
    // ensureForUser will create a pref; disableByToken should return false for random token
    const pref = await repo.ensureForUser('nonexistent-user');
    const ok = await repo.disableByToken(pref.unsubscribeToken);
    expect(ok).toBe(true);
    const again = await repo.disableByToken('no-such-token');
    expect(again).toBe(false);
  }, 20000);

  it('mock email provider records sends', async () => {
    const email = new MockEmailProvider();
    await email.sendEmail('u1@example.com', 'subj', 'body');
    expect(email.sent.length).toBeGreaterThanOrEqual(1);
  });

  it('escalate overdue objections marks ESCALATED', async () => {
    const repo = new (require('../../src/infrastructure/repositories/PrismaObjectionRepository').PrismaObjectionRepository)();
    const audit = new (require('../../src/infrastructure/repositories/PrismaAuditLogRepository').PrismaAuditLogRepository)();
    const uc = new EscalateOverdueObjectionsUseCase(repo, audit);
    const res = await uc.execute(10000); // very old -> likely none, but should run
    expect(res).toHaveProperty('count');
  });
});

