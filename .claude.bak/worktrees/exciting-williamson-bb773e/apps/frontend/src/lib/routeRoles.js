/**
 * Sayfa bazlı rol kontrolü.
 * Her sayfa için: public | [ADMIN, EDUCATOR, CANDIDATE] (boş dizi = sadece giriş yapmış herkes)
 * - public: Giriş gerekmez
 * - CANDIDATE: Aday (My* sayfaları, ProfileSettings, TakeTest, vb.)
 * - EDUCATOR: Eğitici (CreateTest, EducatorDashboard, MyTestPackages, vb.)
 * - ADMIN: Yönetici (Manage*, AdminDashboard, vb.)
 */

export const ROLES = {
  PUBLIC: 'public',
  CANDIDATE: 'CANDIDATE',
  EDUCATOR: 'EDUCATOR',
  ADMIN: 'ADMIN',
};

/** Sayfa adı -> bu rollerin erişebileceği (public ise giriş gerekmez) */
export const PAGE_ROLES = {
  Home: [ROLES.PUBLIC],
  Explore: [ROLES.PUBLIC],
  TestDetail: [ROLES.PUBLIC],
  About: [ROLES.PUBLIC],
  Contact: [ROLES.PUBLIC],
  Privacy: [ROLES.PUBLIC],
  Partnership: [ROLES.PUBLIC],
  Support: [ROLES.PUBLIC],
  Educators: [ROLES.PUBLIC],
  ExamTypes: [ROLES.PUBLIC],
  EducatorProfile: [ROLES.PUBLIC],
  Login: [ROLES.PUBLIC],
  Register: [ROLES.PUBLIC],

  MyTests: [ROLES.CANDIDATE],
  MyResults: [ROLES.CANDIDATE],
  ProfileSettings: [ROLES.CANDIDATE],
  TakeTest: [ROLES.CANDIDATE],
  CompleteProfile: [ROLES.CANDIDATE],
  SelectExamTypes: [ROLES.CANDIDATE],

  EducatorDashboard: [ROLES.EDUCATOR],
  EducatorSettings: [ROLES.EDUCATOR],
  MyTestPackages: [ROLES.EDUCATOR],
  MySales: [ROLES.EDUCATOR],
  MyDiscountCodes: [ROLES.EDUCATOR],
  QuestionReports: [ROLES.EDUCATOR],
  CreateTest: [ROLES.EDUCATOR],
  EditTest: [ROLES.EDUCATOR],

  AdminDashboard: [ROLES.ADMIN],
  ManageExamTypes: [ROLES.ADMIN],
  ManageTopics: [ROLES.ADMIN],
  ManageUsers: [ROLES.ADMIN],
  ManageTests: [ROLES.ADMIN],
  ManageRefunds: [ROLES.ADMIN],
};

/** Rolü büyük harfe normalize et (backend bazen küçük harf dönebilir) */
export function normalizeRole(role) {
  return (role || '').toString().toUpperCase();
}

/**
 * Kullanıcı bu sayfaya erişebilir mi?
 * @param {string} pageName - Sayfa anahtarı (örn. 'MyResults')
 * @param {{ role?: string } | null} user - Giriş yapmış kullanıcı veya null
 */
export function canAccessPage(pageName, user) {
  const roles = PAGE_ROLES[pageName];
  if (!roles || roles.includes(ROLES.PUBLIC)) return true;
  if (!user) return false;
  const r = normalizeRole(user.role);
  if (roles.includes(r)) return true;
  if (r === ROLES.ADMIN) return true;
  return false;
}

/**
 * Rol için ana sayfa (giriş sonrası yönlendirme)
 */
export function getHomeForRole(role) {
  const r = normalizeRole(role);
  if (r === ROLES.ADMIN) return 'AdminDashboard';
  if (r === ROLES.EDUCATOR) return 'EducatorDashboard';
  return 'Explore';
}

/** Giriş/kayıt sayfaları - giriş yapmışsa ana sayfaya yönlendirilir */
export const AUTH_PAGES = ['Login', 'Register'];

/** Sayfa korumalı mı (giriş gerekli) */
export function isProtectedPage(pageName) {
  const roles = PAGE_ROLES[pageName];
  if (!roles || roles.includes(ROLES.PUBLIC)) return false;
  return true;
}
