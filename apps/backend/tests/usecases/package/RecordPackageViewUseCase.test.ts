/**
 * RecordPackageViewUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - packageId boşsa INVALID_INPUT fırlatır
 * - Yayınlanmamış paket için recorded:false döner
 * - Aynı IP 60 saniye içinde rate_limited döner
 * - Başarılı görüntülemede recorded:true döner
 * - IP yoksa ipHash hesaplanmaz
 * - userAgent 500 karaktere kırpılır
 */

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    testPackage: { findFirst: jest.fn() },
    packageView: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('../../../src/common/tenant', () => ({
  getDefaultTenantId: () => 'default-tenant',
}));

import { RecordPackageViewUseCase } from '../../../src/application/use-cases/package/RecordPackageViewUseCase';
import { prisma } from '../../../src/infrastructure/database/prisma';

const mockPrisma = prisma as any;

describe('RecordPackageViewUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.packageView.create.mockResolvedValue({ id: 'view-1' });
  });

  it('packageId boşsa INVALID_INPUT fırlatır', async () => {
    const uc = new RecordPackageViewUseCase();
    await expect(uc.execute({ packageId: '' })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('yayınlanmamış paket için recorded:false döner', async () => {
    mockPrisma.testPackage.findFirst.mockResolvedValue(null);
    const uc = new RecordPackageViewUseCase();
    const result = await uc.execute({ packageId: 'pkg-1' });
    expect(result.recorded).toBe(false);
    expect(result.reason).toBe('package_not_published');
  });

  it('aynı IP 60 saniye içinde rate_limited döner', async () => {
    mockPrisma.testPackage.findFirst.mockResolvedValue({ id: 'pkg-1', tenantId: 'default-tenant' });
    mockPrisma.packageView.findFirst.mockResolvedValue({ id: 'view-recent' });
    const uc = new RecordPackageViewUseCase();
    const result = await uc.execute({ packageId: 'pkg-1', ip: '1.2.3.4' });
    expect(result.recorded).toBe(false);
    expect(result.reason).toBe('rate_limited');
  });

  it('yeni görüntülemede recorded:true döner', async () => {
    mockPrisma.testPackage.findFirst.mockResolvedValue({ id: 'pkg-1', tenantId: 'default-tenant' });
    mockPrisma.packageView.findFirst.mockResolvedValue(null);
    const uc = new RecordPackageViewUseCase();
    const result = await uc.execute({ packageId: 'pkg-1', ip: '1.2.3.4' });
    expect(result.recorded).toBe(true);
    expect(mockPrisma.packageView.create).toHaveBeenCalledTimes(1);
  });

  it('IP yoksa rate limit kontrolü yapılmaz', async () => {
    mockPrisma.testPackage.findFirst.mockResolvedValue({ id: 'pkg-1', tenantId: 'default-tenant' });
    const uc = new RecordPackageViewUseCase();
    const result = await uc.execute({ packageId: 'pkg-1' });
    expect(result.recorded).toBe(true);
    expect(mockPrisma.packageView.findFirst).not.toHaveBeenCalled();
  });

  it('userAgent 500 karakteri geçemez', async () => {
    mockPrisma.testPackage.findFirst.mockResolvedValue({ id: 'pkg-1', tenantId: 'default-tenant' });
    mockPrisma.packageView.findFirst.mockResolvedValue(null);
    const longUA = 'a'.repeat(600);
    const uc = new RecordPackageViewUseCase();
    await uc.execute({ packageId: 'pkg-1', userAgent: longUA });
    const createCall = mockPrisma.packageView.create.mock.calls[0][0];
    expect(createCall.data.userAgent.length).toBeLessThanOrEqual(500);
  });
});
