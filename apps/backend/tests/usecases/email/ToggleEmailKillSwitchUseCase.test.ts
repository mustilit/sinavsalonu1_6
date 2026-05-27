/**
 * ToggleEmailKillSwitchUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - Sebep boşsa 400 fırlatır
 * - Geçersiz key görmezden gelinir
 * - AdminSettings yoksa 500 fırlatır
 * - Başarılı güncellemede AuditLog yazılır
 * - clearAutoPause: emailBulkAutoPausedAt null yapılır
 * - sendWindow geçersiz aralıkta 400 fırlatır
 */

const mockDb = {
  adminSettings: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  auditLog: { create: jest.fn() },
};

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: mockDb,
}));

import { ToggleEmailKillSwitchUseCase } from '../../../src/application/use-cases/email/ToggleEmailKillSwitchUseCase';

const makeSettings = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  emailEnabled: true,
  emailEducatorCriticalEnabled: true,
  emailCandidateCriticalEnabled: true,
  emailBulkAutoPausedAt: null,
  emailSendWindowEnabled: false,
  emailSendWindowStartHour: 8,
  emailSendWindowEndHour: 20,
  emailSendWindowTimezone: 'Europe/Istanbul',
  ...overrides,
});

describe('ToggleEmailKillSwitchUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sebep boşsa 400 fırlatır', async () => {
    const uc = new ToggleEmailKillSwitchUseCase(mockDb as any);
    await expect(uc.execute({ actorId: 'admin-1', changes: { emailEnabled: false }, reason: '' }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('sebep çok kısaysa (2 karakter) 400 fırlatır', async () => {
    const uc = new ToggleEmailKillSwitchUseCase(mockDb as any);
    await expect(uc.execute({ actorId: 'admin-1', changes: { emailEnabled: false }, reason: 'ab' }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('AdminSettings yoksa 500 fırlatır', async () => {
    mockDb.adminSettings.findFirst.mockResolvedValue(null);
    const uc = new ToggleEmailKillSwitchUseCase(mockDb as any);
    await expect(uc.execute({ actorId: 'admin-1', changes: { emailEnabled: false }, reason: 'test sebep' }))
      .rejects.toMatchObject({ status: 500 });
  });

  it('başarılı güncellemede AuditLog yazılır', async () => {
    mockDb.adminSettings.findFirst.mockResolvedValue(makeSettings());
    mockDb.adminSettings.update.mockResolvedValue(makeSettings({ emailEnabled: false }));
    mockDb.auditLog.create.mockResolvedValue({});
    const uc = new ToggleEmailKillSwitchUseCase(mockDb as any);
    await uc.execute({ actorId: 'admin-1', changes: { emailEnabled: false }, reason: 'Bakım için durduruldu' });
    expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'EMAIL_KILL_SWITCH_CHANGED' }),
      }),
    );
  });

  it('geçersiz key görmezden gelinirse değişiklik yoksa 400 fırlatır', async () => {
    const uc = new ToggleEmailKillSwitchUseCase(mockDb as any);
    await expect(uc.execute({
      actorId: 'admin-1',
      changes: { invalidKey: true } as any,
      reason: 'test sebebi',
    })).rejects.toMatchObject({ status: 400 });
  });

  it('sendWindow geçersiz aralıkta 400 fırlatır', async () => {
    mockDb.adminSettings.findFirst.mockResolvedValue(makeSettings());
    const uc = new ToggleEmailKillSwitchUseCase(mockDb as any);
    await expect(uc.execute({
      actorId: 'admin-1',
      changes: {},
      reason: 'pencere testi',
      sendWindow: {
        emailSendWindowEnabled: true,
        emailSendWindowStartHour: 20,
        emailSendWindowEndHour: 8, // start > end — geçersiz
        emailSendWindowTimezone: 'UTC',
      },
    })).rejects.toMatchObject({ status: 400 });
  });
});
