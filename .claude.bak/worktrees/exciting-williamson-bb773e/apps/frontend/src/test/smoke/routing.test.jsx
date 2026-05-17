/**
 * Routing smoke test - önemli sayfalar açılıyor mu?
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/AuthContext';
import Home from '@/pages/Home';
import Explore from '@/pages/Explore';
import Login from '@/pages/Login';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderWithProviders(ui, { route = '/' } = {}) {
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

describe('Routing smoke', () => {
  it('Home sayfası render olur', () => {
    renderWithProviders(<Home />, { route: '/' });
    expect(document.body.textContent).toBeTruthy();
  });

  it('Explore sayfası render olur', () => {
    const { container } = renderWithProviders(<Explore />, { route: '/Explore' });
    expect(container.firstChild).toBeTruthy();
  });

  it('Login sayfası render olur', () => {
    renderWithProviders(<Login />, { route: '/Login' });
    expect(screen.getByRole('heading', { name: /giriş yap/i })).toBeInTheDocument();
  });
});
