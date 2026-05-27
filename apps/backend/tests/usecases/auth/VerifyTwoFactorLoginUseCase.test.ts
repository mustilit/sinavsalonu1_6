/**
 * VerifyTwoFactorLoginUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - pendingMfaToken veya code eksik → BadRequestException
 * - Geçersiz/süresi dolmuş token → UnauthorizedException
 * - Kullanıcı bulunamazsa → UnauthorizedException
 * - TOTP başarılı → accessToken + user bilgisi döner
 * - Recovery code kullanıldığında → AUTH_MFA_RECOVERY_USED audit log
 * - Hem TOTP hem recovery başarısız → AUTH_LOGIN_FAIL audit log + UnauthorizedException
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

// RedisCache mock
jest.mock('../../../src/infrastructure/cache/RedisCache', () => ({
  RedisCache: jest.fn().mockImplementation(() => ({ del: jest.fn().mockResolvedValue(undefined) })),
}));

// encryption mock
jest.mock('../../../src/infrastructure/security/encryption', () => ({
  encrypt: jest.fn((s: string) => `encrypted_${s}`),
  decrypt: jest.fn((s: string) => s.replace('encrypted_', '')),
}));

import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { VerifyTwoFactorLoginUseCase } from '../../../src/application/use-cases/auth/VerifyTwoFactorLoginUseCase';
import { prisma } from '../../../src/infrastructure/database/prisma';

const mockPrisma = prisma as any;

const JWT_SECRET = 'test-jwt-secret-at-least-32-chars-for-test-only';

function makePendingToken(userId: string, expiresIn = '5m') {
  return jwt.sign({ sub: userId, aud: '2fa-login' }, JWT_SECRET, { expiresIn });
}

function makeTfaService(totpResult = true) {
  return {
    verify: jest.fn().mockReturnValue(totpResult),
    consumeRecoveryCode: jest.fn().mockResolvedValue({ ok: false, remaining: [] }),
  };
}

function makeJwtService() {
  return { sign: jest.fn().mockReturnValue('access_token_123') };
}

function makeAudit() {
  return { log: jest.fn().mockResolvedValue(undefined) };
}

function makeUser(overrides: Record<string, any> = {}) {
  return {
    id: 'u1',
    email: 'u@test.com',
    username: 'testuser',
    role: 'EDUCATOR',
    status: 'ACTIVE',
    twoFactorEnabled: true,
    twoFactorSecret: 'encrypted_secret',
    twoFactorRecovery: [],
    ...overrides,
  };
}

const CTX = { ip: '127.0.0.1', userAgent: 'test' };

describe('VerifyTwoFactorLoginUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.update.mockResolvedValue({});
  });

  it('pendingMfaToken eksik ise BadRequestException fırlatır', async () => {
    const uc = new VerifyTwoFactorLoginUseCase(
      makeTfaService() as any,
      makeJwtService() as any,
      makeAudit() as any,
    );
    await expect(uc.execute(CTX, '', '123456')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('code eksik ise BadRequestException fırlatır', async () => {
    const uc = new VerifyTwoFactorLoginUseCase(
      makeTfaService() as any,
      makeJwtService() as any,
      makeAudit() as any,
    );
    await expect(uc.execute(CTX, makePendingToken('u1'), '')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('geçersiz JWT → UnauthorizedException', async () => {
    const uc = new VerifyTwoFactorLoginUseCase(
      makeTfaService() as any,
      makeJwtService() as any,
      makeAudit() as any,
    );
    await expect(uc.execute(CTX, 'not.a.valid.jwt', '123456')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('süresi dolmuş token → UnauthorizedException', async () => {
    const expired = jwt.sign({ sub: 'u1', aud: '2fa-login' }, JWT_SECRET, { expiresIn: '0s' });
    const uc = new VerifyTwoFactorLoginUseCase(
      makeTfaService() as any,
      makeJwtService() as any,
      makeAudit() as any,
    );
    await expect(uc.execute(CTX, expired, '123456')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('kullanıcı bulunamazsa UnauthorizedException fırlatır', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const uc = new VerifyTwoFactorLoginUseCase(
      makeTfaService() as any,
      makeJwtService() as any,
      makeAudit() as any,
    );
    await expect(
      uc.execute(CTX, makePendingToken('u-missing'), '123456'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('TOTP başarılı → accessToken + user döner, AUTH_LOGIN_SUCCESS audit', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeUser());
    const tfa = makeTfaService(true);
    const jwtSvc = makeJwtService();
    const audit = makeAudit();
    const uc = new VerifyTwoFactorLoginUseCase(tfa as any, jwtSvc as any, audit as any);

    const result = await uc.execute(CTX, makePendingToken('u1'), '123456');

    expect(result.accessToken).toBe('access_token_123');
    expect(result.user.id).toBe('u1');
    expect(audit.log).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'AUTH_LOGIN_SUCCESS' }),
    );
  });

  it('TOTP yanlış, recovery başarılı → AUTH_MFA_RECOVERY_USED audit log', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeUser({ twoFactorRecovery: ['hash-code'] }));
    const tfa = makeTfaService(false); // TOTP fail
    tfa.consumeRecoveryCode = jest.fn().mockResolvedValue({ ok: true, remaining: [] });
    const audit = makeAudit();
    const uc = new VerifyTwoFactorLoginUseCase(tfa as any, makeJwtService() as any, audit as any);

    const result = await uc.execute(CTX, makePendingToken('u1'), 'recovery-code');

    expect(audit.log).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'AUTH_MFA_RECOVERY_USED' }),
    );
    expect(result.accessToken).toBeDefined();
  });

  it('hem TOTP hem recovery başarısız → AUTH_LOGIN_FAIL + UnauthorizedException', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeUser());
    const tfa = makeTfaService(false); // TOTP fail
    tfa.consumeRecoveryCode = jest.fn().mockResolvedValue({ ok: false, remaining: [] });
    const audit = makeAudit();
    const uc = new VerifyTwoFactorLoginUseCase(tfa as any, makeJwtService() as any, audit as any);

    await expect(uc.execute(CTX, makePendingToken('u1'), 'bad_code')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'AUTH_LOGIN_FAIL' }),
    );
  });
});
