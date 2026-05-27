/**
 * EmailWebhookController unit testleri.
 */

jest.mock('../../src/common/tenant', () => ({ getDefaultTenantId: () => 'dev-tenant' }));

import { EmailWebhookController } from '../../src/nest/controllers/email-webhook.controller';
import { HttpException } from '@nestjs/common';

describe('EmailWebhookController', () => {
  let controller: EmailWebhookController;
  let mockWebhookUC: { execute: jest.Mock };
  let mockUnsubUC: { execute: jest.Mock };

  beforeEach(() => {
    mockWebhookUC = { execute: jest.fn().mockResolvedValue({ processed: true }) };
    mockUnsubUC = { execute: jest.fn().mockResolvedValue({ success: true, email: 'test@example.com' }) };
    controller = new EmailWebhookController(mockWebhookUC as any, mockUnsubUC as any);
  });

  describe('brevo', () => {
    it('geçerli secret ile webhook işler', async () => {
      const payload = { event: 'delivered', messageId: 'msg-1' };
      const result = await controller.brevo('webhook-secret-123', payload);
      expect(mockWebhookUC.execute).toHaveBeenCalledWith({
        tenantId: 'dev-tenant',
        secret: 'webhook-secret-123',
        payload,
      });
      expect(result).toHaveProperty('processed', true);
    });

    it('secret yoksa 401 fırlatır', async () => {
      await expect(controller.brevo('', {})).rejects.toThrow(HttpException);
    });

    it('secret string değilse 401 fırlatır', async () => {
      await expect(controller.brevo(null as any, {})).rejects.toThrow(HttpException);
    });

    it('use case hata fırlattığında HttpException döner', async () => {
      mockWebhookUC.execute.mockRejectedValueOnce(Object.assign(new Error('Geçersiz imza'), { status: 401 }));
      await expect(controller.brevo('wrong-secret', {})).rejects.toThrow(HttpException);
    });
  });

  describe('unsubscribe', () => {
    it('token ile tüm tercihlerden abonelik kaldırır', async () => {
      const result = await controller.unsubscribe('unsub-token-123', 'all');
      expect(mockUnsubUC.execute).toHaveBeenCalledWith({
        token: 'unsub-token-123',
        category: 'all',
      });
      expect(result).toHaveProperty('success', true);
    });

    it('kategori belirtilmezse "all" varsayılan kullanılır', async () => {
      await controller.unsubscribe('unsub-token-123', undefined);
      expect(mockUnsubUC.execute).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'all' }),
      );
    });

    it('token yoksa 400 fırlatır', async () => {
      await expect(controller.unsubscribe('', undefined)).rejects.toThrow(HttpException);
    });
  });
});
