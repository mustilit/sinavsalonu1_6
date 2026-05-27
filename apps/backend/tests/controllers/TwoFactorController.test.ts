/**
 * TwoFactorController unit testleri.
 * otplib ESM modülü nedeniyle use-case'lerin tamamı mock'lanır.
 */

jest.mock('../../src/infrastructure/audit/AuditLogger', () => ({
  auditContextFromRequest: jest.fn().mockReturnValue({ ip: '127.0.0.1', userAgent: 'test' }),
}));

jest.mock('../../src/application/use-cases/auth/SetupTwoFactorUseCase', () => ({
  SetupTwoFactorUseCase: jest.fn(),
}));
jest.mock('../../src/application/use-cases/auth/VerifyTwoFactorLoginUseCase', () => ({
  VerifyTwoFactorLoginUseCase: jest.fn(),
}));
jest.mock('../../src/application/use-cases/auth/DisableTwoFactorUseCase', () => ({
  DisableTwoFactorUseCase: jest.fn(),
}));

import { TwoFactorController } from '../../src/nest/controllers/v1/two-factor.controller';
import { HttpException } from '@nestjs/common';

describe('TwoFactorController', () => {
  let controller: TwoFactorController;
  let mockSetupUseCase: { setup: jest.Mock; verifySetup: jest.Mock };
  let mockVerifyLoginUseCase: { execute: jest.Mock };
  let mockDisableUseCase: { execute: jest.Mock };

  beforeEach(() => {
    mockSetupUseCase = {
      setup: jest.fn().mockResolvedValue({ qrDataUrl: 'data:image/png;base64,...', pendingSecretToken: 'pst-123', recoveryCodes: ['AAA-111'] }),
      verifySetup: jest.fn().mockResolvedValue({ activated: true }),
    };
    mockVerifyLoginUseCase = { execute: jest.fn().mockResolvedValue({ accessToken: 'jwt-token' }) };
    mockDisableUseCase = { execute: jest.fn().mockResolvedValue({ disabled: true }) };
    controller = new TwoFactorController(
      mockSetupUseCase as any,
      mockVerifyLoginUseCase as any,
      mockDisableUseCase as any,
    );
  });

  describe('setup', () => {
    it('userId ile 2FA kurulumu başlatır', async () => {
      const req = { user: { sub: 'cand-1' } };
      const result = await controller.setup(req as any);
      expect(mockSetupUseCase.setup).toHaveBeenCalledWith(expect.any(Object), 'cand-1');
      expect(result).toHaveProperty('qrDataUrl');
    });

    it('userId yoksa 401 fırlatır', async () => {
      const req = { user: {} };
      await expect(controller.setup(req as any)).rejects.toThrow(HttpException);
    });
  });

  describe('verifySetup', () => {
    it('TOTP kodu ile kurulumu doğrular', async () => {
      const dto = { code: '123456', pendingSecretToken: 'pst-123' } as any;
      const req = { user: { sub: 'cand-1' } };
      await controller.verifySetup(dto, req as any);
      // Controller: verifySetup(ctx, userId, dto.pendingSecretToken, dto.code)
      expect(mockSetupUseCase.verifySetup).toHaveBeenCalledWith(expect.any(Object), 'cand-1', 'pst-123', '123456');
    });

    it('userId yoksa 401 fırlatır', async () => {
      const dto = { code: '000000', pendingSecretToken: 'pst-x' } as any;
      const req = { user: {} };
      await expect(controller.verifySetup(dto, req as any)).rejects.toThrow(HttpException);
    });
  });

  describe('verifyLogin', () => {
    it('2FA giriş kodunu doğrular', async () => {
      const dto = { pendingMfaToken: 'tmp-123', code: '654321' } as any;
      const req = {};
      const result = await controller.verifyLogin(dto, req as any);
      // Controller: execute(ctx, dto.pendingMfaToken, dto.code)
      expect(mockVerifyLoginUseCase.execute).toHaveBeenCalledWith(expect.any(Object), 'tmp-123', '654321');
      expect(result).toHaveProperty('accessToken');
    });
  });

  describe('disable', () => {
    it('şifre doğrulayarak 2FA\'yı kapatır', async () => {
      const dto = { password: 'securePass123' } as any;
      const req = { user: { sub: 'cand-1' } };
      await controller.disable(dto, req as any);
      // Controller: execute(ctx, userId, dto.password)
      expect(mockDisableUseCase.execute).toHaveBeenCalledWith(expect.any(Object), 'cand-1', 'securePass123');
    });

    it('userId yoksa 401 fırlatır', async () => {
      const dto = { password: 'pass' } as any;
      const req = { user: {} };
      await expect(controller.disable(dto, req as any)).rejects.toThrow(HttpException);
    });
  });
});
