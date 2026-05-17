import { describe, it, expect } from 'vitest';
import { canAccessPage, getHomeForRole } from './routeRoles';

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
  });
});
