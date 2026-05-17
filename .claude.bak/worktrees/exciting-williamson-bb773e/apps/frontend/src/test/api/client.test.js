/**
 * API client test - 200/401/500 senaryoları (fetch mock)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiGet, clearAuthStorage } from '@/lib/api/http';

const mockFetch = vi.fn();

describe('API client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
    clearAuthStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearAuthStorage();
  });

  it('200 GET data döner', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ foo: 'bar' })),
    });
    const data = await apiGet('/test');
    expect(data).toEqual({ foo: 'bar' });
  });

  it('401 hata fırlatır', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () =>
        Promise.resolve(
          JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } })
        ),
    });
    await expect(apiGet('/auth/me')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
    });
  });

  it('500 hata fırlatır', async () => {
    const errBody = JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Server error' } });
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        text: () => Promise.resolve(errBody),
      })
    );
    await expect(apiGet('/test')).rejects.toMatchObject({
      code: 'INTERNAL_ERROR',
    });
  });
});
