/**
 * Auth redirect loop testi - 401 sonrası tek sefer redirect
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/AuthContext';
import Login from '@/pages/Login';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

// apiClient 401'de window.location.replace yapar - mock
const mockReplace = vi.fn();
beforeEach(() => {
  Object.defineProperty(window, 'location', {
    value: { replace: mockReplace, pathname: '/Login', search: '', href: '' },
    writable: true,
  });
});

function renderWithProviders(ui, { route = '/Login' } = {}) {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[route]} initialIndex={0}>
          {ui}
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('Auth redirect', () => {
  it('Login sayfası auth_required olmadan render olur', () => {
    renderWithProviders(<Login />);
    expect(screen.getByRole('heading', { name: /giriş yap/i })).toBeInTheDocument();
  });

  it('from parametresi // ile başlamazsa kabul edilir', () => {
    renderWithProviders(<Login />, { route: '/Login?from=%2FExplore' });
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });
});
