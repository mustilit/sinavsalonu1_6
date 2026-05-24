import { describe, it, expect } from 'vitest';
import {
  canAccessPage,
  getHomeForRole,
  normalizeRole,
  isProtectedPage,
  AUTH_PAGES,
  ROLES,
} from './routeRoles';

describe('routeRoles', () => {
  describe('canAccessPage', () => {
    it('allows public pages without user', () => {
      expect(canAccessPage('Explore', null)).toBe(true);
      expect(canAccessPage('Login', null)).toBe(true);
      expect(canAccessPage('Home', null)).toBe(true);
    });

    it('denies admin pages without user', () => {
      expect(canAccessPage('AdminDashboard', null)).toBe(false);
      expect(canAccessPage('ManageTopics', null)).toBe(false);
    });

    it('allows admin pages for ADMIN role', () => {
      expect(canAccessPage('AdminDashboard', { role: 'ADMIN' })).toBe(true);
      expect(canAccessPage('ManageTopics', { role: 'ADMIN' })).toBe(true);
    });

    it('allows educator pages for EDUCATOR role', () => {
      expect(canAccessPage('EducatorDashboard', { role: 'EDUCATOR' })).toBe(true);
      expect(canAccessPage('CreateTest', { role: 'EDUCATOR' })).toBe(true);
    });

    it('allows candidate pages for CANDIDATE role', () => {
      expect(canAccessPage('MyResults', { role: 'CANDIDATE' })).toBe(true);
    });

    it('denies admin pages for WORKER without workerPages', () => {
      expect(canAccessPage('AdminDashboard', { role: 'WORKER', workerPages: [] })).toBe(false);
      expect(canAccessPage('ManageTests', { role: 'WORKER', workerPages: [] })).toBe(false);
    });

    it('allows only assigned pages for WORKER', () => {
      const worker = { role: 'WORKER', workerPages: ['AdminDashboard', 'ManageTests'] };
      expect(canAccessPage('AdminDashboard', worker)).toBe(true);
      expect(canAccessPage('ManageTests', worker)).toBe(true);
      expect(canAccessPage('ManageUsers', worker)).toBe(false);
      expect(canAccessPage('ManageRefunds', worker)).toBe(false);
    });

    it('allows public pages for WORKER regardless of workerPages', () => {
      const worker = { role: 'WORKER', workerPages: [] };
      expect(canAccessPage('Home', worker)).toBe(true);
      expect(canAccessPage('Explore', worker)).toBe(true);
    });
  });

  describe('getHomeForRole', () => {
    it('returns AdminDashboard for ADMIN', () => {
      expect(getHomeForRole('ADMIN')).toBe('AdminDashboard');
    });
    it('returns EducatorDashboard for EDUCATOR', () => {
      expect(getHomeForRole('EDUCATOR')).toBe('EducatorDashboard');
    });
    it('returns Explore for CANDIDATE or other', () => {
      expect(getHomeForRole('CANDIDATE')).toBe('Explore');
      expect(getHomeForRole('unknown')).toBe('Explore');
    });
    it('returns first workerPage for WORKER', () => {
      expect(getHomeForRole('WORKER', { workerPages: ['ManageTests', 'AdminDashboard'] })).toBe('ManageTests');
    });
    it('returns AdminDashboard for WORKER with no pages', () => {
      expect(getHomeForRole('WORKER', { workerPages: [] })).toBe('AdminDashboard');
      expect(getHomeForRole('WORKER', {})).toBe('AdminDashboard');
    });
  });

  describe('normalizeRole', () => {
    it('küçük harfi büyük harfe çevirir', () => {
      expect(normalizeRole('admin')).toBe('ADMIN');
      expect(normalizeRole('candidate')).toBe('CANDIDATE');
    });
    it('mixed-case temizler', () => {
      expect(normalizeRole('AdMiN')).toBe('ADMIN');
    });
    it('null/undefined/empty → boş string', () => {
      expect(normalizeRole(null)).toBe('');
      expect(normalizeRole(undefined)).toBe('');
      expect(normalizeRole('')).toBe('');
    });
    it('zaten büyük harf olanı dokunmaz', () => {
      expect(normalizeRole('EDUCATOR')).toBe('EDUCATOR');
    });
  });

  describe('isProtectedPage', () => {
    it('public sayfalar korumalı değil', () => {
      expect(isProtectedPage('Home')).toBe(false);
      expect(isProtectedPage('Explore')).toBe(false);
      expect(isProtectedPage('Login')).toBe(false);
    });
    it('rol gerektiren sayfalar korumalı', () => {
      expect(isProtectedPage('AdminDashboard')).toBe(true);
      expect(isProtectedPage('MyResults')).toBe(true);
      expect(isProtectedPage('CreateTest')).toBe(true);
    });
    it('tanımsız sayfa korumalı değil (PUBLIC defaultu)', () => {
      expect(isProtectedPage('NonExistentPage')).toBe(false);
    });
  });

  describe('AUTH_PAGES', () => {
    it('giriş/kayıt sayfalarını listeler', () => {
      expect(AUTH_PAGES).toContain('Login');
      expect(AUTH_PAGES).toContain('Register');
      expect(AUTH_PAGES).toContain('ForgotPassword');
      expect(AUTH_PAGES).toContain('ResetPassword');
      expect(AUTH_PAGES).toContain('VerifyEmail');
    });
  });

  describe('ROLES sabitleri', () => {
    it('4 rol + PUBLIC tanımlı', () => {
      expect(ROLES.ADMIN).toBe('ADMIN');
      expect(ROLES.EDUCATOR).toBe('EDUCATOR');
      expect(ROLES.CANDIDATE).toBe('CANDIDATE');
      expect(ROLES.WORKER).toBe('WORKER');
      expect(ROLES.PUBLIC).toBe('public');
    });
  });

  describe('canAccessPage — ek senaryolar', () => {
    it('ADMIN her sayfaya erişebilir (bilinmeyen sayfa hariç)', () => {
      // Bilinmeyen sayfa PAGE_ROLES'da yok → public sayılır
      expect(canAccessPage('UnknownPage', { role: 'ADMIN' })).toBe(true);
    });
    it('lowercase role normalize edilir', () => {
      expect(canAccessPage('AdminDashboard', { role: 'admin' })).toBe(true);
      expect(canAccessPage('CreateTest', { role: 'educator' })).toBe(true);
    });
    it('CANDIDATE admin sayfasına erişemez', () => {
      expect(canAccessPage('AdminDashboard', { role: 'CANDIDATE' })).toBe(false);
      expect(canAccessPage('ManageUsers', { role: 'CANDIDATE' })).toBe(false);
    });
    it('EDUCATOR aday sayfalarına direkt erişemez (rol uyumsuz)', () => {
      // MyResults CANDIDATE'a açık, EDUCATOR'a değil
      expect(canAccessPage('MyResults', { role: 'EDUCATOR' })).toBe(false);
    });
    it('WORKER workerPages undefined → admin sayfalarına erişemez', () => {
      expect(canAccessPage('AdminDashboard', { role: 'WORKER' })).toBe(false);
    });
  });
});
