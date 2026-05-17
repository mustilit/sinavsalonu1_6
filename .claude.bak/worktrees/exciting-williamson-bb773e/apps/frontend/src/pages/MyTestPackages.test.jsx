import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as AuthContext from '@/lib/AuthContext';
import MyTestPackages from './MyTestPackages';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

vi.mock('@/api/base44Client', () => ({
  base44: {
    entities: {
      TestPackage: {
        filter: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue({}),
      },
      ExamType: {
        filter: vi.fn().mockResolvedValue([]),
      },
    },
  },
}));

describe('MyTestPackages', () => {
  beforeEach(() => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: 'edu-1', role: 'EDUCATOR', email: 'educator@demo.com' },
      isAuthenticated: true,
    });
  });

  it('renders page title and empty state when educator has no tests', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <MyTestPackages />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText(/Test Paketlerim/i)).toBeInTheDocument();
    expect(screen.getByText(/Oluşturduğun tüm test paketleri/i)).toBeInTheDocument();

    // Empty state should appear after loading
    expect(await screen.findByText(/Henüz test oluşturmadın/i)).toBeInTheDocument();
  });
});
