import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createPageUrl } from '@/utils';
import { useAppNavigate } from '@/lib/navigation';
import { toSafeMessage } from '@/lib/api/errors';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const rawFrom = searchParams.get('from');
  // Open redirect koruması: sadece / ile başlayan, // içermeyen, Login/Register olmayan path'ler
  const safeFrom = rawFrom &&
    rawFrom.startsWith('/') &&
    !rawFrom.startsWith('//') &&
    !/^\/(Login|Register)/i.test(rawFrom)
    ? rawFrom
    : null;
  const { login } = useAuth();
  const navigate = useAppNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      const target = safeFrom || createPageUrl('Home');
      navigate(target, { replace: true });
    } catch (err) {
      setLoading(false);
      const safe = toSafeMessage(err, { isProd: import.meta.env?.PROD });
      setError(safe || 'Giriş başarısız.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" data-testid="login-page">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-slate-900 mb-6 text-center">Giriş Yap</h1>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-posta</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@email.com"
              required
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Şifre</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          Hesabınız yok mu?{' '}
          <Link to={createPageUrl('Register')} className="text-indigo-600 hover:underline">
            Kayıt ol
          </Link>
        </p>
        <p className="mt-2 text-center">
          <Link to={createPageUrl('Home')} className="text-sm text-slate-500 hover:text-slate-700">
            ← Ana sayfaya dön
          </Link>
        </p>
        <p className="mt-4 text-center text-xs text-slate-400">
          Demo: aday@demo.com veya educator@demo.com — şifre: demo123
        </p>
      </div>
    </div>
  );
}
