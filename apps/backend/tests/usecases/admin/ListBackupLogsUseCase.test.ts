/**
 * ListBackupLogsUseCase testleri
 *
 * Doğrulanan davranışlar:
 * - Cursor pagination: hasMore ve nextCursor doğru hesaplanır
 * - Status filtresi prisma where'e geçer
 * - sizeBytes BigInt → string serialize edilir
 * - nextCursor null olduğunda liste son sayfadadır
 */

jest.mock('../../../src/infrastructure/database/prisma', () => ({
  prisma: {
    backupLog: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../../../src/common/tenant', () => ({
  getDefaultTenantId: () => 'default-tenant',
}));

import { ListBackupLogsUseCase } from '../../../src/application/use-cases/admin/ListBackupLogsUseCase';
import { prisma } from '../../../src/infrastructure/database/prisma';

const mockPrisma = prisma as any;

const makeLog = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  trigger: 'MANUAL',
  status: 'SUCCESS',
  scheduledAt: new Date(),
  startedAt: new Date(),
  finishedAt: new Date(),
  durationMs: 1234,
  sizeBytes: BigInt(5000000),
  fileName: 'backup.sql.gz',
  targetPath: '/backups',
  errorMessage: null,
  createdAt: new Date(),
  actor: null,
  ...overrides,
});

describe('ListBackupLogsUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('5 kayıt limit=5 olduğunda hasMore:false ve nextCursor:null döner', async () => {
    mockPrisma.backupLog.findMany.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => makeLog(`log-${i}`)),
    );
    const uc = new ListBackupLogsUseCase();
    const result = await uc.execute({ limit: 5 });
    expect(result.items).toHaveLength(5);
    expect(result.nextCursor).toBeNull();
  });

  it('limit+1 satır geldiğinde hasMore:true ve nextCursor dolu olur', async () => {
    mockPrisma.backupLog.findMany.mockResolvedValue(
      Array.from({ length: 6 }, (_, i) => makeLog(`log-${i}`)),
    );
    const uc = new ListBackupLogsUseCase();
    const result = await uc.execute({ limit: 5 });
    expect(result.items).toHaveLength(5);
    expect(result.nextCursor).toEqual({ id: 'log-4' });
  });

  it('status filtresi WHERE kısmına iletilir', async () => {
    mockPrisma.backupLog.findMany.mockResolvedValue([]);
    const uc = new ListBackupLogsUseCase();
    await uc.execute({ status: 'FAILED' });
    expect(mockPrisma.backupLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'FAILED' }),
      }),
    );
  });

  it('sizeBytes BigInt ise string olarak serialize edilir', async () => {
    mockPrisma.backupLog.findMany.mockResolvedValue([makeLog('log-0', { sizeBytes: BigInt(12345) })]);
    const uc = new ListBackupLogsUseCase();
    const result = await uc.execute({});
    expect(typeof result.items[0].sizeBytes).toBe('string');
    expect(result.items[0].sizeBytes).toBe('12345');
  });

  it('sizeBytes null ise null olarak kalır', async () => {
    mockPrisma.backupLog.findMany.mockResolvedValue([makeLog('log-0', { sizeBytes: null })]);
    const uc = new ListBackupLogsUseCase();
    const result = await uc.execute({});
    expect(result.items[0].sizeBytes).toBeNull();
  });
});
