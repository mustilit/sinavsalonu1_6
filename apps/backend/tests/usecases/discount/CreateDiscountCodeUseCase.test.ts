/**
 * CreateDiscountCodeUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - User bulunamazsa → USER_NOT_FOUND
 * - CANDIDATE rolü → USER_NOT_AUTHORIZED
 * - SUSPENDED hesap → USER_SUSPENDED
 * - Kod < 3 karakter → INVALID_CODE
 * - percentOff < 1 → INVALID_PERCENT
 * - percentOff > 100 → INVALID_PERCENT
 * - maxUses < 1 → INVALID_MAX_USES
 * - validFrom >= validUntil → INVALID_DATES
 * - Aynı kod zaten var → CODE_EXISTS
 * - Admin sınırını aşan educator → DISCOUNT_LIMIT_EXCEEDED
 * - Başarı: kod büyük harfe çevrilir, audit log yazılır
 */

const mockDiscountCodeCreate = jest.fn();
const mockDiscountCodeFindUnique = jest.fn();
const mockPromoFindUnique = jest.fn();
const mockPrismaQueryRaw = jest.fn();

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    discountCode: {
      create: (...args: any[]) => mockDiscountCodeCreate(...args),
      findUnique: (...args: any[]) => mockDiscountCodeFindUnique(...args),
    },
    platformPromoCode: {
      findUnique: (...args: any[]) => mockPromoFindUnique(...args),
    },
    $queryRaw: (...args: any[]) => mockPrismaQueryRaw(...args),
  },
}));

import { BadRequestException } from '@nestjs/common';
import { CreateDiscountCodeUseCase } from '../../../src/application/use-cases/discount/CreateDiscountCodeUseCase';
import { AppError } from '../../../src/application/errors/AppError';

function makeUserRepo(user: any) {
  return { findById: jest.fn().mockResolvedValue(user) };
}

function makeAuditRepo() {
  return { create: jest.fn().mockResolvedValue({}) };
}

function makeEducator(overrides: Record<string, any> = {}) {
  return { id: 'edu-1', role: 'EDUCATOR', status: 'ACTIVE', ...overrides };
}

const BASE_INPUT = {
  code: 'SAVE20',
  percentOff: 20,
};

describe('CreateDiscountCodeUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDiscountCodeFindUnique.mockResolvedValue(null); // kod yok
    mockPromoFindUnique.mockResolvedValue(null); // platform promo çakışması yok
    mockPrismaQueryRaw.mockResolvedValue([{ maxDiscountPercent: 50 }]);
    mockDiscountCodeCreate.mockResolvedValue({
      id: 'disc-1',
      code: 'SAVE20',
      percentOff: 20,
      maxUses: null,
      usedCount: 0,
      isActive: true,
      validFrom: null,
      validUntil: null,
      description: null,
      createdAt: new Date(),
    });
  });

  it('kullanıcı bulunamazsa USER_NOT_FOUND fırlatır', async () => {
    const userRepo = makeUserRepo(null);
    const uc = new CreateDiscountCodeUseCase(userRepo as any, makeAuditRepo() as any);
    await expect(uc.execute('edu-missing', BASE_INPUT)).rejects.toMatchObject({
      code: 'USER_NOT_FOUND',
    });
  });

  it('CANDIDATE rolü → USER_NOT_AUTHORIZED fırlatır', async () => {
    const userRepo = makeUserRepo(makeEducator({ role: 'CANDIDATE' }));
    const uc = new CreateDiscountCodeUseCase(userRepo as any, makeAuditRepo() as any);
    await expect(uc.execute('cand-1', BASE_INPUT)).rejects.toMatchObject({
      code: 'USER_NOT_AUTHORIZED',
    });
  });

  it('SUSPENDED hesap → USER_SUSPENDED fırlatır', async () => {
    const userRepo = makeUserRepo(makeEducator({ status: 'SUSPENDED' }));
    const uc = new CreateDiscountCodeUseCase(userRepo as any, makeAuditRepo() as any);
    await expect(uc.execute('edu-1', BASE_INPUT)).rejects.toMatchObject({
      code: 'USER_SUSPENDED',
    });
  });

  it('kod 2 karakter → INVALID_CODE fırlatır', async () => {
    const userRepo = makeUserRepo(makeEducator());
    const uc = new CreateDiscountCodeUseCase(userRepo as any, makeAuditRepo() as any);
    await expect(uc.execute('edu-1', { ...BASE_INPUT, code: 'AB' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('percentOff = 0 → INVALID_PERCENT fırlatır', async () => {
    const userRepo = makeUserRepo(makeEducator());
    const uc = new CreateDiscountCodeUseCase(userRepo as any, makeAuditRepo() as any);
    await expect(uc.execute('edu-1', { ...BASE_INPUT, percentOff: 0 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('percentOff = 101 → INVALID_PERCENT fırlatır', async () => {
    const userRepo = makeUserRepo(makeEducator());
    const uc = new CreateDiscountCodeUseCase(userRepo as any, makeAuditRepo() as any);
    await expect(uc.execute('edu-1', { ...BASE_INPUT, percentOff: 101 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maxUses = 0 → INVALID_MAX_USES fırlatır', async () => {
    const userRepo = makeUserRepo(makeEducator());
    const uc = new CreateDiscountCodeUseCase(userRepo as any, makeAuditRepo() as any);
    await expect(uc.execute('edu-1', { ...BASE_INPUT, maxUses: 0 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('validFrom >= validUntil → INVALID_DATES fırlatır', async () => {
    const userRepo = makeUserRepo(makeEducator());
    const uc = new CreateDiscountCodeUseCase(userRepo as any, makeAuditRepo() as any);
    const from = new Date('2026-06-01');
    const until = new Date('2026-05-01'); // önce bitiyor
    await expect(uc.execute('edu-1', { ...BASE_INPUT, validFrom: from, validUntil: until })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('aynı kod zaten var → CODE_EXISTS fırlatır', async () => {
    mockDiscountCodeFindUnique.mockResolvedValue({ id: 'existing', code: 'SAVE20' });
    const userRepo = makeUserRepo(makeEducator());
    const uc = new CreateDiscountCodeUseCase(userRepo as any, makeAuditRepo() as any);
    await expect(uc.execute('edu-1', BASE_INPUT)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('educator admin sınırını (50%) aşan indirim → DISCOUNT_LIMIT_EXCEEDED', async () => {
    mockPrismaQueryRaw.mockResolvedValue([{ maxDiscountPercent: 30 }]);
    const userRepo = makeUserRepo(makeEducator());
    const uc = new CreateDiscountCodeUseCase(userRepo as any, makeAuditRepo() as any);
    await expect(uc.execute('edu-1', { ...BASE_INPUT, percentOff: 40 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('ADMIN rolü admin sınırını aşabilir', async () => {
    mockPrismaQueryRaw.mockResolvedValue([{ maxDiscountPercent: 30 }]);
    const userRepo = makeUserRepo(makeEducator({ role: 'ADMIN' }));
    const uc = new CreateDiscountCodeUseCase(userRepo as any, makeAuditRepo() as any);
    // ADMIN 75% girebilir — hata fırlatmamalı
    await expect(uc.execute('admin-1', { ...BASE_INPUT, percentOff: 75 })).resolves.toBeDefined();
  });

  it('ADMIN oluşturduğunda kod GLOBAL: createdById=null', async () => {
    const userRepo = makeUserRepo(makeEducator({ role: 'ADMIN' }));
    const uc = new CreateDiscountCodeUseCase(userRepo as any, makeAuditRepo() as any);
    await uc.execute('admin-1', BASE_INPUT);
    expect(mockDiscountCodeCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ createdById: null }) }),
    );
  });

  it('EDUCATOR oluşturduğunda kod kendine bağlı: createdById=educatorId', async () => {
    const userRepo = makeUserRepo(makeEducator());
    const uc = new CreateDiscountCodeUseCase(userRepo as any, makeAuditRepo() as any);
    await uc.execute('edu-1', BASE_INPUT);
    expect(mockDiscountCodeCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ createdById: 'edu-1' }) }),
    );
  });

  it('kod platform promo kodu olarak varsa → CODE_EXISTS_AS_PROMO (çakışma engeli)', async () => {
    mockPromoFindUnique.mockResolvedValue({ id: 'promo-1', code: 'SAVE20' });
    const userRepo = makeUserRepo(makeEducator({ role: 'ADMIN' }));
    const uc = new CreateDiscountCodeUseCase(userRepo as any, makeAuditRepo() as any);
    await expect(uc.execute('admin-1', BASE_INPUT)).rejects.toMatchObject({
      code: 'CODE_EXISTS_AS_PROMO',
      status: 409,
    });
    expect(mockDiscountCodeCreate).not.toHaveBeenCalled();
  });

  it('başarı: kod büyük harfe çevrilir, discountCode.create çağrılır', async () => {
    const userRepo = makeUserRepo(makeEducator());
    const auditRepo = makeAuditRepo();
    const uc = new CreateDiscountCodeUseCase(userRepo as any, auditRepo as any);

    const result = await uc.execute('edu-1', { ...BASE_INPUT, code: 'save20' });

    expect(mockDiscountCodeCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ code: 'SAVE20' }) }),
    );
    expect(result.code).toBe('SAVE20');
  });

  it('audit log yazılır', async () => {
    const userRepo = makeUserRepo(makeEducator());
    const auditRepo = makeAuditRepo();
    const uc = new CreateDiscountCodeUseCase(userRepo as any, auditRepo as any);

    await uc.execute('edu-1', BASE_INPUT);

    expect(auditRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DISCOUNT_CREATED' }),
    );
  });

  it('audit log hatası main flow u kesmez', async () => {
    const userRepo = makeUserRepo(makeEducator());
    const auditRepo = { create: jest.fn().mockRejectedValue(new Error('AUDIT_FAIL')) };
    const uc = new CreateDiscountCodeUseCase(userRepo as any, auditRepo as any);

    const result = await uc.execute('edu-1', BASE_INPUT);
    expect(result.code).toBe('SAVE20');
  });
});
