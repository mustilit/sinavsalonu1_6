/**
 * Route Guards - Sayfa erişim kontrolü
 * Standart korumalı route pattern: auth kontrolü route seviyesinde yapılır.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { canAccessPage, getHomeForRole } from '@/lib/routeRoles';

/** Yükleme spinner */
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/**
 * Auth sayfaları (Login, Register): Giriş yapmışsa ana sayfaya yönlendir
 * Rol bazlı sayfa yerine Home kullanılır - tam sayfa yenileme boş ekran verebiliyor
 */
export function AuthRoute({ children, pageName = 'Login' }) {
  const { user, isLoadingAuth } = useAuth();
  const location = useLocation();

  if (isLoadingAuth) return <LoadingSpinner />;
  if (user) {
    return <Navigate to={createPageUrl('Home')} replace state={{ from: location }} />;
  }
  return children;
}

/**
 * Korumalı sayfalar: Giriş yoksa Login'e yönlendir, rol yetkisi yoksa ana sayfaya yönlendir
 */
export function ProtectedRoute({ children, pageName }) {
  const { user, isLoadingAuth } = useAuth();
  const location = useLocation();

  if (isLoadingAuth) return <LoadingSpinner />;

  // Giriş yok
  if (!user) {
    const from = (location.pathname || '/') + (location.search || '');
    const loginPath = from && from !== '/' && from !== '/Login' && from !== '/Register'
      ? `/Login?from=${encodeURIComponent(from)}`
      : '/Login';
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  // Rol yetkisi yok
  if (!canAccessPage(pageName, user)) {
    const home = getHomeForRole(user.role);
    return <Navigate to={createPageUrl(home)} replace />;
  }

  return children;
}

/**
 * Public sayfalar: Herkes erişebilir (Layout ile sarılır)
 */
export function PublicRoute({ children }) {
  const { isLoadingAuth } = useAuth();
  if (isLoadingAuth) return <LoadingSpinner />;
  return children;
}
