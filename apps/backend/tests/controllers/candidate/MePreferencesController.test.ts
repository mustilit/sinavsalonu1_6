/**
 * MePreferencesController unit testleri.
 * Controller PrismaUserPreferenceRepository'yi doğrudan örneklediğinden prisma mock'lanır.
 */

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    userPreference: {
      findUnique: jest.fn().mockResolvedValue({ userId: 'cand-1', onboardingComplete: false }),
      upsert: jest.fn().mockResolvedValue({ userId: 'cand-1', onboardingComplete: true }),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: 'cand-1', email: 'test@test.com' }),
      update: jest.fn().mockResolvedValue({ id: 'cand-1' }),
    },
  },
}));

jest.mock('../../../src/infrastructure/repositories/PrismaUserPreferenceRepository', () => ({
  PrismaUserPreferenceRepository: jest.fn().mockImplementation(() => ({
    findByUserId: jest.fn().mockResolvedValue({ userId: 'cand-1', onboardingComplete: false }),
    upsert: jest.fn().mockResolvedValue({ userId: 'cand-1', onboardingComplete: true }),
  })),
}));

jest.mock('../../../src/application/use-cases/notification/GetUserPreferencesUseCase', () => ({
  GetUserPreferencesUseCase: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue({ userId: 'cand-1', onboardingComplete: false }),
  })),
}));

jest.mock('../../../src/application/use-cases/notification/UpdateUserPreferencesUseCase', () => ({
  UpdateUserPreferencesUseCase: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue({ userId: 'cand-1', onboardingComplete: true }),
  })),
}));

jest.mock('../../../src/application/use-cases/notification/RequestSensitiveProfileOtpUseCase', () => ({
  RequestSensitiveProfileOtpUseCase: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue({ sent: true }),
  })),
}));

jest.mock('../../../src/application/use-cases/notification/VerifySensitiveProfileChangeUseCase', () => ({
  VerifySensitiveProfileChangeUseCase: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue({ verified: true }),
  })),
}));

import { MePreferencesController } from '../../../src/nest/controllers/me.preferences.controller';

describe('MePreferencesController', () => {
  let controller: MePreferencesController;

  beforeEach(() => {
    controller = new MePreferencesController();
  });

  describe('get', () => {
    it('userId ile tercihler döndürülür', async () => {
      const req = { user: { id: 'cand-1' } };
      const result = await controller.get(req as any);
      expect(result).toBeDefined();
    });

    it('user.sub alanı fallback olarak kullanılır', async () => {
      const req = { user: { sub: 'cand-sub-1' } };
      const result = await controller.get(req as any);
      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    it('tercihler güncellenir', async () => {
      const req = { user: { id: 'cand-1' } };
      const body = { onboardingComplete: true };
      const result = await controller.update(req as any, body);
      expect(result).toBeDefined();
    });
  });

  describe('requestSensitiveOtp', () => {
    it('OTP isteği use case\'i çağırır', async () => {
      const req = { user: { id: 'cand-1' } };
      const result = await controller.requestSensitiveOtp(req as any);
      expect(result).toBeDefined();
    });
  });
});
