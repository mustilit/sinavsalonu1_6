import { useState } from 'react';
import { auth } from '@/api/dalClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createPageUrl } from '@/utils';
import { useAppNavigate } from '@/lib/navigation';
import { Link } from 'react-router-dom';

export default function Register() {
  const urlParams = new URLSearchParams(window.location.search);
  const roleParam = urlParams.get('role'); // 'candidate' | 'educator' | null
  const isEducator = roleParam === 'educator';

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useAppNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isEducator) {
        await auth.registerEducator(email, username, password);
      } else {
        await auth.register(email, username, password);
      }
      navigate(createPageUrl('Login'), { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error || err?.response?.data?.message || 'Kayıt başarısız.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-slate-900 mb-2 text-center">Kayıt Ol</h1>

        {roleParam && (
          <div className={`mb-6 text-center text-sm font-medium px-4 py-2 rounded-xl ${isEducator ? 'bg-violet-50 text-violet-700' : 'bg-indigo-50 text-indigo-700'}`}>
            {isEducator ? '🎓 Eğitici olarak kaydoluyorsunuz' : '📝 Aday olarak kaydoluyorsunuz'}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium text-slate-700 mb-1">E-posta</label>
            <Input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@email.com"
              required
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="reg-username" className="block text-sm font-medium text-slate-700 mb-1">Kullanıcı adı</label>
            <Input
              id="reg-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="kullaniciadi"
              required
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="reg-password" className="block text-sm font-medium text-slate-700 mb-1">Şifre</label>
            <Input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
            {loading ? 'Kaydediliyor...' : 'Kayıt Ol'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600">
          Zaten hesabınız var mı?{' '}
          <Link to={createPageUrl('Login')} className="text-indigo-600 underline hover:no-underline">
            Giriş yap
          </Link>
        </p>
        <p className="mt-2 text-center">
          <Link to={createPageUrl('Home')} className="text-sm text-slate-500 hover:text-slate-700">
            ← Ana sayfaya dön
          </Link>
        </p>
      </div>
    </div>
  );
}
