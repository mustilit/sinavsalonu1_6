import { useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/**
 * Page name + query → url
 * @param {string} pageName
 * @param {Record<string, string | number | boolean | null | undefined>} [query]
 */
export function buildPageUrl(pageName, query) {
  const base = createPageUrl(pageName);
  if (!query) return base;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * SPA içinde güvenli navigate helper (window.location yerine).
 */
export function useAppNavigate() {
  const navigate = useNavigate();
  return useCallback((to, opts) => navigate(to, opts), [navigate]);
}

/**
 * Login redirect param'ı üretir (open redirect korumalı).
 */
export function useLoginRedirect() {
  const location = useLocation();
  return useCallback(() => {
    const path = (location.pathname || '/') + (location.search || '');
    const safeFrom = path && path.startsWith('/') && !path.startsWith('//') && !/^\/(Login|Register)/i.test(path) ? path : null;
    return buildPageUrl('Login', safeFrom ? { from: safeFrom } : undefined);
  }, [location.pathname, location.search]);
}

/**
 * Login sayfasında `from` parametresini güvenli parse eder.
 */
export function useSafeFromParam() {
  const [searchParams] = useSearchParams();
  const rawFrom = searchParams.get('from');
  const safeFrom =
    rawFrom &&
    rawFrom.startsWith('/') &&
    !rawFrom.startsWith('//') &&
    !/^\/(Login|Register)/i.test(rawFrom)
      ? rawFrom
      : null;
  return safeFrom;
}

