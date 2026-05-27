/**
 * VerifyDeviceUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - Token eksik/kısa → INVALID_TOKEN
 * - Token bulunamazsa → TOKEN_NOT_FOUND
 * - Token süresi dolmuşsa → TOKEN_EXPIRED
 * - Başarı: trusted=true, trustToken null yapılır, deviceId döner
 */

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    userDevice: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { BadRequestException } from '@nestjs/common';
import { VerifyDeviceUseCase } from '../../../src/application/use-cases/auth/VerifyDeviceUseCase';
import { prisma } from '../../../src/infrastructure/database/prisma';
import { AppError } from '../../../src/application/errors/AppError';

const mockPrisma = prisma as any;

function makeDevice(overrides: Record<string, any> = {}) {
  return {
    id: 'dev-1',
    userId: 'u1',
    trusted: false,
    trustToken: 'valid-token-at-least-16-chars',
    trustTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 saat sonra
    ...overrides,
  };
}

describe('VerifyDeviceUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.userDevice.update.mockResolvedValue({
      id: 'dev-1',
      trusted: true,
    });
  });

  it('token eksikse INVALID_TOKEN fırlatır', async () => {
    const uc = new VerifyDeviceUseCase();
    await expect(uc.execute({ token: '' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('token 15 karakter ise INVALID_TOKEN fırlatır (min 16)', async () => {
    const uc = new VerifyDeviceUseCase();
    await expect(uc.execute({ token: 'short-token-123' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('token bulunamazsa TOKEN_NOT_FOUND fırlatır', async () => {
    mockPrisma.userDevice.findUnique.mockResolvedValue(null);
    const uc = new VerifyDeviceUseCase();
    await expect(
      uc.execute({ token: 'valid-length-token-notfound' }),
    ).rejects.toMatchObject({ code: 'TOKEN_NOT_FOUND' });
  });

  it('token süresi dolmuşsa TOKEN_EXPIRED fırlatır', async () => {
    const expiredDevice = makeDevice({
      trustTokenExpiresAt: new Date(Date.now() - 1000), // 1 sn önce
    });
    mockPrisma.userDevice.findUnique.mockResolvedValue(expiredDevice);
    const uc = new VerifyDeviceUseCase();
    await expect(
      uc.execute({ token: 'valid-token-at-least-16-chars' }),
    ).rejects.toMatchObject({ code: 'TOKEN_EXPIRED' });
  });

  it('başarı: userDevice.update çağrılır, trusted=true, trustToken=null', async () => {
    mockPrisma.userDevice.findUnique.mockResolvedValue(makeDevice());
    const uc = new VerifyDeviceUseCase();

    const result = await uc.execute({ token: 'valid-token-at-least-16-chars' });

    expect(mockPrisma.userDevice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          trusted: true,
          trustToken: null,
          trustTokenExpiresAt: null,
        }),
      }),
    );
    expect(result.deviceId).toBe('dev-1');
  });

  it('trustTokenExpiresAt null ise süre kontrolü atlanır', async () => {
    mockPrisma.userDevice.findUnique.mockResolvedValue(
      makeDevice({ trustTokenExpiresAt: null }),
    );
    const uc = new VerifyDeviceUseCase();
    const result = await uc.execute({ token: 'valid-token-at-least-16-chars' });
    expect(result.deviceId).toBe('dev-1');
  });
});
