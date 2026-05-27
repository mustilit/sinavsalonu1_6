/**
 * SetupTwoFactorUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - setup: 2FA zaten aktifse BadRequestException
 * - setup: kullanıcı bulunamazsa UnauthorizedException
 * - setup: başarı → otpauthUrl + qrPng + recoveryCodes + pendingSecretToken döner
 * - verifySetup: bozuk/süresi dolmuş token → BadRequestException
 * - verifySetup: TOTP kodu yanlış → BadRequestException
 * - verifySetup: başarı → user.update çağrılır, audit log atılır
 */

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), update: jest.fn() },
  },
}));

// TwoFactorService'i mock'la — otplib (@scure/base ESM) yüklenmesin
jest.mock('../../../src/infrastructure/security/TwoFactorService', () => ({
  TwoFactorService: jest.fn(),
}));

// encryption mock'u
jest.mock('../../../src/infrastructure/security/encryption', () => ({
  encrypt: jest.fn((s: string) => `enc_${s}`),
  decrypt: jest.fn((s: string) => s.replace('enc_', '')),
}));

import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { SetupTwoFactorUseCase } from '../../../src/application/use-cases/auth/SetupTwoFactorUseCase';
import { prisma } from '../../../src/infrastructure/database/prisma';

const mockPrisma = prisma as any;

function makeTfaService(verifyResult = true) {
  return {
    setup: jest.fn().mockResolvedValue({
      secret: 'TEST_SECRET_BASE32',
      otpauthUrl: 'otpauth://totp/test@example.com?secret=TEST',
      qrPng: 'data:image/png;base64,iVBORw0KGgo=',
      recoveryPlain: ['code1', 'code2', 'code3'],
      recoveryHashed: ['hash1', 'hash2', 'hash3'],
    }),
    verify: jest.fn().mockReturnValue(verifyResult),
  };
}

function makeAudit() {
  return { log: jest.fn().mockResolvedValue(undefined), logAsync: jest.fn() };
}

const CTX = { userId: 'u1', tenantId: 't1', ip: '127.0.0.1' };

describe('SetupTwoFactorUseCase — setup adımı', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.update.mockResolvedValue({});
  });

  it('kullanıcı bulunamazsa UnauthorizedException fırlatır', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const uc = new SetupTwoFactorUseCase(makeTfaService() as any, makeAudit() as any);
    await expect(uc.setup(CTX, 'u-missing')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('2FA zaten etkinse BadRequestException fırlatır', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'u@test.com',
      twoFactorEnabled: true,
    });
    const uc = new SetupTwoFactorUseCase(makeTfaService() as any, makeAudit() as any);
    await expect(uc.setup(CTX, 'u1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('başarı: otpauthUrl, qrPng, recoveryCodes, pendingSecretToken döner', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'u@test.com',
      twoFactorEnabled: false,
    });
    const tfa = makeTfaService();
    const uc = new SetupTwoFactorUseCase(tfa as any, makeAudit() as any);

    const result = await uc.setup(CTX, 'u1');

    expect(result.otpauthUrl).toContain('otpauth://');
    expect(result.qrPng).toContain('data:image/png');
    expect(result.recoveryCodes).toHaveLength(3);
    expect(result.pendingSecretToken).toBeDefined();
    expect(typeof result.pendingSecretToken).toBe('string');
  });

  it('secret henüz DB ye yazılmaz (user.update çağrılmaz)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'u@test.com',
      twoFactorEnabled: false,
    });
    const uc = new SetupTwoFactorUseCase(makeTfaService() as any, makeAudit() as any);
    await uc.setup(CTX, 'u1');
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });
});

describe('SetupTwoFactorUseCase — verifySetup adımı', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.update.mockResolvedValue({});
  });

  it('bozuk token → BadRequestException', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'u@test.com',
      twoFactorEnabled: false,
    });
    const uc = new SetupTwoFactorUseCase(makeTfaService() as any, makeAudit() as any);
    await expect(
      uc.verifySetup(CTX, 'u1', 'not.a.jwt.token', '123456'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('TOTP kodu yanlış → BadRequestException', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'u@test.com',
      twoFactorEnabled: false,
    });
    const tfa = makeTfaService();
    const uc = new SetupTwoFactorUseCase(tfa as any, makeAudit() as any);

    // Önce geçerli token al
    const setupResult = await uc.setup(CTX, 'u1');

    // TOTP verify → false döndür
    tfa.verify.mockReturnValue(false);

    await expect(
      uc.verifySetup(CTX, 'u1', setupResult.pendingSecretToken, '999999'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('başarı: user.update çağrılır, twoFactorEnabled=true, audit log atılır', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'u@test.com',
      twoFactorEnabled: false,
    });
    const tfa = makeTfaService(true);
    const audit = makeAudit();
    const uc = new SetupTwoFactorUseCase(tfa as any, audit as any);

    const setupResult = await uc.setup(CTX, 'u1');
    await uc.verifySetup(CTX, 'u1', setupResult.pendingSecretToken, '123456');

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ twoFactorEnabled: true }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'AUTH_MFA_ENABLED' }),
    );
  });
});
