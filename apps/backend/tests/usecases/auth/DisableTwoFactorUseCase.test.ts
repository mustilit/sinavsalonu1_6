/**
 * DisableTwoFactorUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - Şifre parametresi eksikse BadRequestException
 * - Kullanıcı bulunamazsa UnauthorizedException
 * - 2FA aktif değilse BadRequestException
 * - Şifre yanlışsa UnauthorizedException
 * - Başarı: twoFactorEnabled=false, secret null yapılır, audit log atılır
 */

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), update: jest.fn() },
  },
}));

import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { DisableTwoFactorUseCase } from '../../../src/application/use-cases/auth/DisableTwoFactorUseCase';
import { prisma } from '../../../src/infrastructure/database/prisma';

const mockPrisma = prisma as any;

function makeUser(overrides: Record<string, any> = {}) {
  return {
    id: 'u1',
    email: 'u@test.com',
    role: 'EDUCATOR',
    twoFactorEnabled: true,
    passwordHash: 'hashed_password',
    ...overrides,
  };
}

function makePasswordService(valid = true) {
  return { compare: jest.fn().mockResolvedValue(valid) };
}

function makeAudit() {
  return { log: jest.fn().mockResolvedValue(undefined) };
}

const CTX = { userId: 'u1', tenantId: 't1' };

describe('DisableTwoFactorUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.update.mockResolvedValue({});
  });

  it('şifre parametresi boşsa BadRequestException fırlatır', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeUser());
    const uc = new DisableTwoFactorUseCase(makePasswordService() as any, makeAudit() as any);
    await expect(uc.execute(CTX, 'u1', '')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('kullanıcı bulunamazsa UnauthorizedException fırlatır', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const uc = new DisableTwoFactorUseCase(makePasswordService() as any, makeAudit() as any);
    await expect(uc.execute(CTX, 'u-missing', 'pass123')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('2FA zaten kapalıysa BadRequestException fırlatır', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeUser({ twoFactorEnabled: false }));
    const uc = new DisableTwoFactorUseCase(makePasswordService() as any, makeAudit() as any);
    await expect(uc.execute(CTX, 'u1', 'pass123')).rejects.toBeInstanceOf(BadRequestException);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('şifre yanlışsa UnauthorizedException fırlatır', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeUser());
    const uc = new DisableTwoFactorUseCase(makePasswordService(false) as any, makeAudit() as any);
    await expect(uc.execute(CTX, 'u1', 'wrongpass')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('başarı: user.update ile twoFactorEnabled=false, audit log atılır', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeUser());
    const audit = makeAudit();
    const uc = new DisableTwoFactorUseCase(makePasswordService(true) as any, audit as any);

    await uc.execute(CTX, 'u1', 'correct_pass');

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ twoFactorEnabled: false, twoFactorSecret: null }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'AUTH_MFA_DISABLED' }),
    );
  });
});
