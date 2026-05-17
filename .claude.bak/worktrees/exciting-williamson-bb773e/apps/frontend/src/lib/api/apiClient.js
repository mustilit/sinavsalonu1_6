/**
 * Axios-benzeri API client - tüm istekler bu katmandan geçer.
 * - Base URL: config/env
 * - 401: storage temizle, redirect loop engeli
 */
import * as http from './http';
import { clearAuthStorage } from './http';

/** 401 sonrası redirect - loop engeli: aynı path'e tekrar push yapma */
let _last401RedirectAt = 0;
const REDIRECT_COOLDOWN_MS = 2000;

function handle401() {
  clearAuthStorage();
  if (typeof window === 'undefined') return;
  const now = Date.now();
  if (now - _last401RedirectAt < REDIRECT_COOLDOWN_MS) return;
  _last401RedirectAt = now;
  const path = window.location.pathname || '';
  if (/^\/Login$/i.test(path)) return; // Zaten Login'deyse redirect yapma
  window.location.replace('/Login' + (path && path !== '/' ? `?from=${encodeURIComponent(path)}` : ''));
}

/** Axios response şeklinde wrap */
function wrap(data) {
  return { data, status: 200, headers: {} };
}

/** Hata oluştur - axios uyumlu (err.response, err.code) */
function toAxiosError(e) {
  const err = e instanceof Error ? e : new Error(String(e));
  if (!err.response && e?.response) err.response = e.response;
  if (!err.code && e?.code) err.code = e.code;
  if (err.response?.status === 401) handle401();
  return err;
}

/**
 * Axios-like API client
 */
const api = {
  async get(path, config = {}) {
    try {
      const params = config.params;
      const search = params && Object.keys(params).length
        ? '?' + new URLSearchParams(params).toString()
        : '';
      const fullPath = path + search;
      const data = await http.apiGet(fullPath, { signal: config.signal });
      return wrap(data);
    } catch (e) {
      throw toAxiosError(e);
    }
  },
  async post(path, body, config = {}) {
    try {
      const data = await http.apiPost(path, body ?? config.data, { signal: config.signal });
      return wrap(data);
    } catch (e) {
      throw toAxiosError(e);
    }
  },
  async patch(path, body, config = {}) {
    try {
      const data = await http.apiPatch(path, body ?? config.data, { signal: config.signal });
      return wrap(data);
    } catch (e) {
      throw toAxiosError(e);
    }
  },
  async put(path, body, config = {}) {
    try {
      const data = await http.apiPut(path, body ?? config.data, { signal: config.signal });
      return wrap(data);
    } catch (e) {
      throw toAxiosError(e);
    }
  },
  async delete(path, config = {}) {
    try {
      await http.apiDelete(path, { signal: config.signal, body: config.data });
      return wrap(null);
    } catch (e) {
      throw toAxiosError(e);
    }
  },
};

api.defaults = { baseURL: '' };

export default api;
export { api };
