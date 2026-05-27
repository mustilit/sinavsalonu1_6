/**
 * NotifyNewDeviceLoginUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - Aynı fingerprint mevcut → lastSeenAt güncellenir, mail gönderilmez, isNewDevice=false
 * - İlk cihaz (count=0) → trusted=true oluşturulur, mail gönderilmez, isNewDevice=false
 * - Yeni (ekstra) cihaz → trusted=false oluşturulur, mail tetiklenir, isNewDevice=true
 * - Mail hatası → main flow kesilmez, isNewDevice=true döner
 * - DB hatası → best-effort, isNewDevice=false döner (exception yutulur)
 */

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    userDevice: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock('../../../src/common/tenant', () => ({
  getDefaultTenantId: jest.fn().mockReturnValue('tenant-1'),
}));

import { NotifyNewDeviceLoginUseCase } from '../../../src/application/use-cases/auth/NotifyNewDeviceLoginUseCase';
import { prisma } from '../../../src/infrastructure/database/prisma';

const mockPrisma = prisma as any;

const BASE_INPUT = {
  userId: 'u1',
  userEmail: 'u@test.com',
  username: 'testuser',
  userRole: 'EDUCATOR' as const,
  userAgent: 'Mozilla/5.0 Chrome/100',
  ip: '1.2.3.4',
};

function makeSendEmail(shouldFail = false) {
  return {
    execute: shouldFail
      ? jest.fn().mockRejectedValue(new Error('MAIL_FAIL'))
      : jest.fn().mockResolvedValue({}),
  };
}

describe('NotifyNewDeviceLoginUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.userDevice.findUnique.mockResolvedValue(null);
    mockPrisma.userDevice.update.mockResolvedValue({});
    mockPrisma.userDevice.create.mockResolvedValue({ id: 'dev-new' });
    mockPrisma.userDevice.count.mockResolvedValue(1); // ekstra cihaz senaryosu için
  });

  it('aynı fingerprint mevcutsa lastSeenAt güncellenir, isNewDevice=false', async () => {
    mockPrisma.userDevice.findUnique.mockResolvedValue({ id: 'dev-1' });
    const uc = new NotifyNewDeviceLoginUseCase(null);

    const result = await uc.execute(BASE_INPUT);

    expect(mockPrisma.userDevice.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ lastSeenAt: expect.any(Date) }) }),
    );
    expect(result.isNewDevice).toBe(false);
  });

  it('aynı fingerprint mevcutsa userDevice.create çağrılmaz', async () => {
    mockPrisma.userDevice.findUnique.mockResolvedValue({ id: 'dev-1' });
    const uc = new NotifyNewDeviceLoginUseCase(null);
    await uc.execute(BASE_INPUT);
    expect(mockPrisma.userDevice.create).not.toHaveBeenCalled();
  });

  it('ilk cihaz (count=0) → trusted=true oluşturulur, isNewDevice=false', async () => {
    mockPrisma.userDevice.count.mockResolvedValue(0);
    const uc = new NotifyNewDeviceLoginUseCase(null);

    const result = await uc.execute(BASE_INPUT);

    expect(mockPrisma.userDevice.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ trusted: true }) }),
    );
    expect(result.isNewDevice).toBe(false);
  });

  it('yeni ekstra cihaz → trusted=false, trustToken oluşturulur, isNewDevice=true', async () => {
    const sendEmail = makeSendEmail();
    const uc = new NotifyNewDeviceLoginUseCase(sendEmail as any);

    const result = await uc.execute(BASE_INPUT);

    expect(mockPrisma.userDevice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ trusted: false, trustToken: expect.any(String) }),
      }),
    );
    expect(result.isNewDevice).toBe(true);
  });

  it('yeni cihazda sendEmail çağrılır', async () => {
    const sendEmail = makeSendEmail();
    const uc = new NotifyNewDeviceLoginUseCase(sendEmail as any);

    await uc.execute(BASE_INPUT);

    expect(sendEmail.execute).toHaveBeenCalledWith(
      expect.objectContaining({ templateKey: 'new-device-login' }),
    );
  });

  it('mail hatası main flow u kesmez, isNewDevice=true döner', async () => {
    const sendEmail = makeSendEmail(true); // mail fail
    const uc = new NotifyNewDeviceLoginUseCase(sendEmail as any);

    const result = await uc.execute(BASE_INPUT);

    expect(result.isNewDevice).toBe(true);
  });

  it('DB hatası → best-effort, isNewDevice=false döner', async () => {
    mockPrisma.userDevice.create.mockRejectedValue(new Error('DB_FAIL'));
    mockPrisma.userDevice.count.mockResolvedValue(0);
    const uc = new NotifyNewDeviceLoginUseCase(null);

    const result = await uc.execute(BASE_INPUT);

    // exception yutulur, false döner
    expect(result.isNewDevice).toBe(false);
  });

  it('sendEmail null ise mail tetiklenmez', async () => {
    const uc = new NotifyNewDeviceLoginUseCase(null);
    const result = await uc.execute(BASE_INPUT);
    // Hata fırlatmamalı
    expect(result.isNewDevice).toBe(true);
  });
});
