import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { queryClientInstance } from '@/lib/query-client';

const STORAGE_KEY = 'dal_auth';
// sessionStorage: Tarayıcı sekmesi kapatılınca oturum sonlanır
const storage = typeof window !== 'undefined' ? sessionStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const isDev = import.meta.env?.DEV ?? false;

function authLog(...args) {
  if (isDev) console.debug('[auth]', ...args);
}

/** Tüm auth ile ilgili storage anahtarlarını temizle */
function clearAllAuthStorage() {
  try {
    storage.removeItem(STORAGE_KEY);
    storage.removeItem('token');
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('token');
    localStorage.removeItem('base44_access_token');
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem('token');
  } catch {}
}

function loadStoredAuth() {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { user, token } = JSON.parse(raw);
    if (user && token) return { user, token };
  } catch {}
  return null;
}

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);

  const setAuth = useCallback((userData, token) => {
    setUser(userData);
    setIsAuthenticated(!!userData && !!token);
    if (userData && token) {
      storage.setItem(STORAGE_KEY, JSON.stringify({ user: userData, token }));
      storage.setItem('token', token);
    } else {
      storage.removeItem(STORAGE_KEY);
      storage.removeItem('token');
    }
  }, []);

  const checkUserAuth = useCallback(async () => {
    const stored = loadStoredAuth();
    if (!stored?.token) {
      authLog('no stored token');
      clearAllAuthStorage();
      queryClientInstance.clear();
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setUser(null);
      return;
    }
    storage.setItem('token', stored.token);
    try {
      // Dev'de backend cold-start uzun sürebiliyor; false logout'u azalt
      const timeoutMs = (import.meta.env?.DEV ?? false) ? 20000 : 8000;
      const mePromise = base44.auth.me();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Auth timeout')), timeoutMs)
      );
      const currentUser = await Promise.race([mePromise, timeoutPromise]);
      authLog('me ok', { id: currentUser?.id, role: currentUser?.role });
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (err) {
      console.error('Auth check failed:', err);
      clearAllAuthStorage();
      queryClientInstance.clear();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    setIsLoadingPublicSettings(false);
    checkUserAuth();
  }, [checkUserAuth]);

  const logout = useCallback((shouldRedirect = true) => {
    authLog('logout');
    setUser(null);
    setIsAuthenticated(false);
    clearAllAuthStorage();
    queryClientInstance.clear();
    base44.auth.logout();
    if (shouldRedirect) {
      window.location.replace('/Login');
    }
  }, []);

  const navigateToLogin = useCallback((returnUrl) => {
    const path = (returnUrl || (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '')).replace(/^https?:\/\/[^/]+/, '') || '/';
    const from = path && path !== '/' && !/^\/Login/i.test(path) ? `?from=${encodeURIComponent(path)}` : '';
    window.location.href = '/Login' + from;
  }, []);

  const login = useCallback(async (email, password) => {
    authLog('login start');
    // Kullanıcı değişimi: stale query cache'lerini temizle (rol değişimi senaryosu)
    queryClientInstance.clear();
    const data = await base44.auth.login(email, password);
    const u = data?.user ?? data?.data?.user;
    const token = data?.token ?? data?.data?.token;
    if (!u || !token) {
      throw new Error('Giriş yanıtında kullanıcı veya token eksik.');
    }
    setAuth(u, token);
    authLog('login ok', { id: u?.id, role: u?.role });
    return u;
  }, [setAuth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        logout,
        navigateToLogin,
        login,
        setAuth,
        checkAppState: checkUserAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
