/**
 * AppError domain sınıfı testleri
 *
 * Doğrulanan davranışlar:
 * - code, status, message doğru atanır
 * - instanceof Error kontrolü geçer
 * - name 'AppError' olarak set edilir
 * - details opsiyonel olarak taşınır
 * - catch bloğunda tipine göre ayrıştırılabilir
 */

import { AppError } from '../../src/application/errors/AppError';

describe('AppError', () => {
  it('code, status, message doğru atanır', () => {
    const err = new AppError('NOT_FOUND', 'Kayıt bulunamadı', 404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.status).toBe(404);
    expect(err.message).toBe('Kayıt bulunamadı');
  });

  it('instanceof Error true olur', () => {
    const err = new AppError('BAD_REQUEST', 'Geçersiz', 400);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it('name "AppError" olarak ayarlanır', () => {
    const err = new AppError('FORBIDDEN', 'Yetkisiz', 403);
    expect(err.name).toBe('AppError');
  });

  it('details opsiyonel olarak taşınır', () => {
    const details = { field: 'email', constraint: 'format' };
    const err = new AppError('VALIDATION', 'Geçersiz format', 422, details);
    expect(err.details).toEqual(details);
  });

  it('details belirtilmezse undefined olur', () => {
    const err = new AppError('GENERIC', 'Hata', 500);
    expect(err.details).toBeUndefined();
  });

  it('catch bloğunda kod ile ayrıştırılabilir', () => {
    const codes: string[] = [];
    try {
      throw new AppError('DUPLICATE', 'Çift kayıt', 409);
    } catch (e) {
      if (e instanceof AppError) {
        codes.push(e.code);
      }
    }
    expect(codes).toEqual(['DUPLICATE']);
  });

  it('status kodu HTTP standartlarını destekler', () => {
    const statuses = [400, 401, 403, 404, 409, 422, 429, 500, 503];
    statuses.forEach((status) => {
      const err = new AppError('CODE', 'mesaj', status);
      expect(err.status).toBe(status);
    });
  });
});
