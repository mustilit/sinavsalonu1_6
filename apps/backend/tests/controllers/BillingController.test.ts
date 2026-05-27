/**
 * BillingController unit testleri.
 * IdempotencyInterceptor NestJS decorator olduğundan controller düzeyinde mock'lanır.
 */

jest.mock('../../src/nest/interceptors/idempotency.interceptor', () => ({
  IdempotencyInterceptor: jest.fn().mockImplementation(() => ({
    intercept: jest.fn((ctx: any, next: any) => next.handle()),
  })),
}));

import { BillingController } from '../../src/nest/controllers/v1/billing.controller';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('BillingController', () => {
  let controller: BillingController;
  let mockStartCheckout: { execute: jest.Mock };
  let mockCreatePortal: { execute: jest.Mock };
  let mockGetMySubscription: { execute: jest.Mock };

  beforeEach(() => {
    mockStartCheckout = { execute: jest.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/pay/xxx', sessionId: 'cs_xxx' }) };
    mockCreatePortal = { execute: jest.fn().mockResolvedValue({ url: 'https://billing.stripe.com/p/session/xxx' }) };
    mockGetMySubscription = { execute: jest.fn().mockResolvedValue({ tier: 'PRO', status: 'ACTIVE', currentPeriodEnd: '2026-01-01' }) };
    controller = new BillingController(
      mockStartCheckout as any,
      mockCreatePortal as any,
      mockGetMySubscription as any,
    );
  });

  describe('checkout', () => {
    it('userId ve tenantId ile checkout session oluşturur', async () => {
      const dto = { kind: 'EDUCATOR', tier: 'PRO', period: 'MONTHLY', successUrl: 'https://app/success', cancelUrl: 'https://app/cancel' } as any;
      const req = { user: { sub: 'edu-1' }, tenant: { id: 'tenant-1' }, headers: {} };
      const result = await controller.checkout(dto, req as any);
      expect(mockStartCheckout.execute).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'edu-1', tenantId: 'tenant-1', tier: 'PRO' }),
      );
      expect(result).toHaveProperty('url');
    });

    it('userId yoksa 401 HTTP exception fırlatır', async () => {
      const dto = { kind: 'EDUCATOR', tier: 'PRO' } as any;
      const req = { user: {}, tenant: { id: 'tenant-1' }, headers: {} };
      await expect(controller.checkout(dto, req as any)).rejects.toThrow(HttpException);
    });

    it('tenantId yoksa 400 HTTP exception fırlatır', async () => {
      const dto = { kind: 'EDUCATOR', tier: 'PRO' } as any;
      const req = { user: { sub: 'edu-1' }, tenant: {}, headers: {} };
      await expect(controller.checkout(dto, req as any)).rejects.toThrow(HttpException);
    });

    it('Idempotency-Key header\'ı use case\'e iletilir', async () => {
      const dto = { kind: 'EDUCATOR', tier: 'PRO', period: 'YEARLY', successUrl: 'https://a', cancelUrl: 'https://b' } as any;
      const req = { user: { sub: 'edu-1' }, tenant: { id: 'tenant-1' }, headers: { 'idempotency-key': 'idem-123' }, header: (h: string) => h === 'idempotency-key' ? 'idem-123' : undefined };
      await controller.checkout(dto, req as any);
      expect(mockStartCheckout.execute).toHaveBeenCalledWith(
        expect.objectContaining({ idempotencyKey: 'idem-123' }),
      );
    });
  });

  describe('portal', () => {
    it('userId ile portal linki üretir', async () => {
      const dto = { returnUrl: 'https://app/billing' } as any;
      const req = { user: { sub: 'edu-1' }, tenant: { id: 'tenant-1' } };
      const result = await controller.portal(dto, req as any);
      expect(mockCreatePortal.execute).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'edu-1', tenantId: 'tenant-1' }),
      );
      expect(result).toHaveProperty('url');
    });
  });

  describe('subscription', () => {
    it('userId ile abonelik durumunu getirir', async () => {
      const req = { user: { sub: 'edu-1' }, tenant: { id: 'tenant-1' } };
      const result = await controller.subscription(req as any, undefined);
      expect(mockGetMySubscription.execute).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'edu-1' }),
      );
      expect(result).toHaveProperty('tier', 'PRO');
    });
  });
});
