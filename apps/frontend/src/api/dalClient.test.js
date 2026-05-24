import { describe, it, expect, vi, beforeEach } from 'vitest';

// dalClient `@/lib/api/apiClient`'tan default `api` import ediyor. Module mock
// ile bu importu fake bir Axios-benzeri client'la değiştirip her endpoint'in
// doğru path + method + body kullanıp kullanmadığını kontrol ediyoruz.
const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@/lib/api/apiClient', () => ({ default: mockApi }));

// Mock'tan SONRA import et — module hoisting nedeniyle vi.mock üstte.
const dal = await import('./dalClient');

beforeEach(() => {
  Object.values(mockApi).forEach((fn) => fn.mockReset());
});

describe('adminBackup endpoint kontratı', () => {
  it('getSettings → GET /admin/backup/settings, data döner', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        backupEnabled: true,
        backupCronExpression: '0 3 * * *',
        backupTargetDir: '/var/backups',
        backupRetentionDays: 7,
      },
    });
    const r = await dal.adminBackup.getSettings();
    expect(mockApi.get).toHaveBeenCalledWith('/admin/backup/settings');
    expect(r.backupEnabled).toBe(true);
    expect(r.backupCronExpression).toBe('0 3 * * *');
  });

  it('updateSettings → PATCH /admin/backup/settings body ile', async () => {
    mockApi.patch.mockResolvedValue({ data: { backupEnabled: false } });
    const body = { backupEnabled: false };
    const r = await dal.adminBackup.updateSettings(body);
    expect(mockApi.patch).toHaveBeenCalledWith('/admin/backup/settings', body);
    expect(r.backupEnabled).toBe(false);
  });

  it('runNow → POST /admin/backup/run-now, { logId } döner', async () => {
    mockApi.post.mockResolvedValue({ data: { logId: 'log-1' } });
    const r = await dal.adminBackup.runNow();
    expect(mockApi.post).toHaveBeenCalledWith('/admin/backup/run-now');
    expect(r.logId).toBe('log-1');
  });

  it('listLogs → GET /admin/backup/logs?... opts ile query string', async () => {
    mockApi.get.mockResolvedValue({ data: { items: [], nextCursor: null } });
    await dal.adminBackup.listLogs({
      cursor: { id: 'log-99' },
      limit: 50,
      status: 'SUCCESS',
    });
    const url = mockApi.get.mock.calls[0][0];
    expect(url).toMatch(/^\/admin\/backup\/logs\?/);
    expect(url).toContain('cursorId=log-99');
    expect(url).toContain('limit=50');
    expect(url).toContain('status=SUCCESS');
  });

  it('listLogs argümansız çalışır (varsayılan)', async () => {
    mockApi.get.mockResolvedValue({ data: { items: [], nextCursor: null } });
    const r = await dal.adminBackup.listLogs();
    expect(r.items).toEqual([]);
    expect(r.nextCursor).toBeNull();
  });

  it('listLogs response boş gelirse default obje döner', async () => {
    mockApi.get.mockResolvedValue({ data: null });
    const r = await dal.adminBackup.listLogs();
    expect(r).toEqual({ items: [], nextCursor: null });
  });
});

describe('adminModeration endpoint kontratı (örneklem)', () => {
  it('listQueue → GET /admin/moderation/queue cursor + filter query', async () => {
    mockApi.get.mockResolvedValue({ data: { items: [], nextCursor: null } });
    await dal.adminModeration.listQueue({
      cursor: { id: 'mod-7', createdAt: '2026-05-01T00:00:00Z' },
      limit: 20,
      category: 'HATE_SPEECH',
      userId: 'u-1',
    });
    const url = mockApi.get.mock.calls[0][0];
    expect(url).toContain('cursorId=mod-7');
    expect(url).toContain('limit=20');
    expect(url).toContain('category=HATE_SPEECH');
    expect(url).toContain('userId=u-1');
  });

  it('approveResult → POST /admin/moderation/results/:id/approve body ile', async () => {
    mockApi.post.mockResolvedValue({ data: { ok: true } });
    await dal.adminModeration.approveResult('mod-1', { reviewerNote: 'ok' });
    expect(mockApi.post).toHaveBeenCalledWith(
      '/admin/moderation/results/mod-1/approve',
      { reviewerNote: 'ok' },
    );
  });

  it('rejectResult — note opsiyonel', async () => {
    mockApi.post.mockResolvedValue({ data: {} });
    await dal.adminModeration.rejectResult('mod-2');
    expect(mockApi.post).toHaveBeenCalledWith('/admin/moderation/results/mod-2/reject', {
      reviewerNote: undefined,
    });
  });
});
