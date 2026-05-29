/**
 * Register sayfası unit testleri
 * Kapsam: form render, educator modu, sözleşme onay popup akışı, submit, hata state
 *
 * Sprint 16 — Sözleşme onayı artık inline checkbox değil, "Kayıt Ol" sonrası
 * açılan ContractAcceptDialog (popup) içinde alınır. Testler bu akışı simüle eder.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Register from '../Register';

// auth + contracts modülünü mock'la — ağ çağrısı yapma.
// contracts.getActive popup AÇILDIĞINDA (on-demand) çağrılır.
vi.mock('@/api/dalClient', () => ({
  auth: {
    register: vi.fn(),
    registerEducator: vi.fn(),
  },
  entities: {},
  contracts: {
    getActive: vi.fn().mockImplementation((type) =>
      Promise.resolve({
        id: type === 'PRIVACY' ? 'mock-privacy-id' : 'mock-terms-id',
        type,
        version: 1,
        title: 'Mock Sözleşme',
        content: 'Mock metin',
        publishedAt: '2026-01-01T00:00:00.000Z',
      }),
    ),
  },
}));

// react-markdown ESM — jsdom'da basit pass-through mock yeterli
vi.mock('react-markdown', () => ({
  default: ({ children }) => <div data-testid="markdown">{children}</div>,
}));

// TurnstileWidget — Cloudflare widget; test ortamında render etme
vi.mock('@/components/auth/TurnstileWidget', () => ({
  default: ({ onSuccess }) => (
    <button type="button" data-testid="turnstile-mock" onClick={() => onSuccess('token-123')}>
      Captcha
    </button>
  ),
}));

// GoogleSignInButton — harici script
vi.mock('@/components/auth/GoogleSignInButton', () => ({
  default: () => <div data-testid="google-btn" />,
}));

vi.mock('@/lib/navigation', () => ({
  useAppNavigate: () => vi.fn(),
}));

vi.mock('@/utils', () => ({
  createPageUrl: (name) => `/${name}`,
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

// NOT: Register `window.location.search`'i HER render'da okur (memoize yok).
// Bu yüzden search'i render sonrası geri yüklemeyiz — yoksa re-render'da
// (örn. alan değişince) isEducator yanlış hesaplanır. search beforeEach'te
// sıfırlanır, test boyunca sabit kalır.
function renderRegister(search = '') {
  Object.defineProperty(window, 'location', {
    writable: true,
    configurable: true,
    value: { ...window.location, search },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/Register${search}`]}>
        <Register />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/** Form alanlarını doldur + "Kayıt Ol" → sözleşme popup'ını açar. */
function fillAndOpenDialog({ email = 'test@example.com', username = 'testuser', password = 'pass123' } = {}) {
  fireEvent.change(screen.getByLabelText(/e-posta/i), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/kullanıcı adı/i), { target: { value: username } });
  fireEvent.change(screen.getByLabelText(/şifre/i), { target: { value: password } });
  fireEvent.submit(screen.getByRole('button', { name: /kayıt ol/i }).closest('form'));
}

/** Popup'ta iki sözleşme checkbox'ını işaretle + "Onayla ve Kaydı Tamamla"ya bas. */
async function acceptInDialog() {
  const checkboxes = await screen.findAllByRole('checkbox');
  checkboxes.forEach((cb) => fireEvent.click(cb));
  const confirmBtn = await screen.findByRole('button', { name: /onayla ve kaydı tamamla/i });
  await waitFor(() => expect(confirmBtn).not.toBeDisabled());
  fireEvent.click(confirmBtn);
}

beforeEach(() => {
  vi.clearAllMocks();
  // Her test öncesi window.location.search'i sıfırla (testler arası sızma olmasın)
  Object.defineProperty(window, 'location', {
    writable: true,
    configurable: true,
    value: { ...window.location, search: '' },
  });
});

describe('Register sayfası', () => {
  it('aday modu URL\'si olmadığında temel form alanları render edilir', () => {
    renderRegister();
    expect(screen.getByLabelText(/e-posta/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/kullanıcı adı/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/şifre/i)).toBeInTheDocument();
  });

  it('educator rolü seçildiğinde ad ve soyad alanları görünür', () => {
    renderRegister('?role=educator');
    expect(screen.getByLabelText(/^ad$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^soyad$/i)).toBeInTheDocument();
  });

  it('aday modu seçildiğinde ad/soyad alanları görünmez', () => {
    renderRegister('?role=candidate');
    expect(screen.queryByLabelText(/^ad$/i)).not.toBeInTheDocument();
  });

  it('rol seçici: parametre yokken Aday varsayılan; "Eğitici" tıklanınca ad/soyad açılır', async () => {
    renderRegister(); // ?role= yok → varsayılan aday
    // Başlangıçta eğitici alanları yok
    expect(screen.queryByLabelText(/^ad$/i)).not.toBeInTheDocument();
    // Görünür rol seçici: "Eğitici" kartına tıkla
    fireEvent.click(screen.getByRole("button", { name: /eğitici/i }));
    // Ad + Soyad alanları açılır
    expect(await screen.findByLabelText(/^ad$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^soyad$/i)).toBeInTheDocument();
  });

  it('"Kayıt Ol" butonu başlangıçta aktiftir (onay popup\'ta alınır)', () => {
    renderRegister();
    const btn = screen.getByRole('button', { name: /kayıt ol/i });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
  });

  it('"Kayıt Ol" tıklanınca sözleşme popup\'ı açılır ve onay butonu işaretlenene kadar disabled', async () => {
    renderRegister();
    fillAndOpenDialog();
    // Popup başlığı + onay butonu görünür
    expect(await screen.findByText(/sözleşmeleri onayla/i)).toBeInTheDocument();
    const confirmBtn = await screen.findByRole('button', { name: /onayla ve kaydı tamamla/i });
    expect(confirmBtn).toBeDisabled();
    // İki checkbox işaretlenince aktifleşir
    const checkboxes = await screen.findAllByRole('checkbox');
    checkboxes.forEach((cb) => fireEvent.click(cb));
    await waitFor(() => expect(confirmBtn).not.toBeDisabled());
  });

  it('başarılı aday kaydında auth.register contract ID\'leri ile çağrılır', async () => {
    const { auth } = await import('@/api/dalClient');
    auth.register.mockResolvedValue({ ok: true });
    renderRegister();

    fillAndOpenDialog();
    await acceptInDialog();

    await waitFor(() => {
      expect(auth.register).toHaveBeenCalledWith(
        'test@example.com',
        'testuser',
        'pass123',
        expect.objectContaining({
          acceptedTermsContractId: 'mock-terms-id',
          acceptedPrivacyContractId: 'mock-privacy-id',
        }),
      );
    });
  });

  it('educator kaydında registerEducator EDUCATOR contract ID ile çağrılır', async () => {
    const { auth } = await import('@/api/dalClient');
    auth.registerEducator.mockResolvedValue({ ok: true });
    renderRegister('?role=educator');

    fireEvent.change(screen.getByLabelText(/^ad$/i), { target: { value: 'Ahmet' } });
    fireEvent.change(screen.getByLabelText(/^soyad$/i), { target: { value: 'Yılmaz' } });
    fillAndOpenDialog({ email: 'edu@example.com', username: 'eduuser', password: 'pass123' });
    await acceptInDialog();

    await waitFor(() => {
      expect(auth.registerEducator).toHaveBeenCalledWith(
        'edu@example.com',
        'eduuser',
        'pass123',
        expect.objectContaining({
          acceptedEducatorContractId: 'mock-terms-id',
          acceptedPrivacyContractId: 'mock-privacy-id',
        }),
      );
    });
  });

  it('API hata döndüğünde popup kapanır ve hata mesajı gösterilir', async () => {
    const { auth } = await import('@/api/dalClient');
    auth.register.mockRejectedValue({
      response: { data: { message: 'Bu email zaten kayıtlı' } },
    });
    renderRegister();

    fillAndOpenDialog({ email: 'existing@example.com', username: 'existinguser', password: 'pass123' });
    await acceptInDialog();

    await waitFor(() => {
      expect(screen.getByText('Bu email zaten kayıtlı')).toBeInTheDocument();
    });
  });

  it('sözleşme yüklenemezse popup hata mesajı gösterir (dead-end yok)', async () => {
    const { contracts } = await import('@/api/dalClient');
    contracts.getActive.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    renderRegister();

    fillAndOpenDialog();

    await waitFor(() => {
      expect(screen.getByText(/sözleşme metinleri şu an yüklenemedi/i)).toBeInTheDocument();
    });
  });

  it('Login sayfasına giden link mevcut', () => {
    renderRegister();
    const loginLink = screen.getByRole('link', { name: /giriş yap/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/Login');
  });
});
