import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/AuthContext';
import Login from './Login';

const queryClient = new QueryClient();

function renderWithProviders(ui, { initialEntries = ['/Login'] } = {}) {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries} initialIndex={0}>
          {ui}
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('Login', () => {
  it('renders login form with email and password fields', () => {
    renderWithProviders(<Login />);
    expect(screen.getByRole('heading', { name: /giriş yap/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ornek@email.com/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /giriş yap/i })).toBeInTheDocument();
  });

  it('renders login page when accessed with from param (Login?from=%2FExplore)', () => {
    renderWithProviders(<Login />, { initialEntries: ['/Login?from=%2FExplore'] });
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /giriş yap/i })).toBeInTheDocument();
  });
});
