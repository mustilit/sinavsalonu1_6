import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import api from '@/api/dalClient';
import TestPackageCard from '@/components/ui/TestPackageCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Star, BookOpen, Users } from 'lucide-react';
import { buildPageUrl, useAppNavigate } from '@/lib/navigation';

function isEmailLike(v) {
  return typeof v === 'string' && v.includes('@');
}

export default function EducatorProfile() {
  const navigate = useAppNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const idOrEmail = urlParams.get('email') || urlParams.get('id') || '';

  const endpoint = useMemo(() => {
    if (!idOrEmail) return null;
    if (isEmailLike(idOrEmail)) return `/educators/by-email?email=${encodeURIComponent(idOrEmail)}`;
    return `/educators/${encodeURIComponent(idOrEmail)}`;
  }, [idOrEmail]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['educatorPage', idOrEmail],
    queryFn: async () => {
      const res = await api.get(endpoint);
      return res?.data ?? res;
    },
    enabled: !!endpoint,
    retry: 1,
  });

  if (!idOrEmail) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <h2 className="text-2xl font-bold text-slate-900">Eğitici bulunamadı</h2>
        <Link to={createPageUrl('Educators')} className="text-indigo-600 mt-4 inline-block">
          Eğiticilere Dön
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto animate-pulse">
        <div className="h-32 bg-slate-200 rounded-2xl mb-6" />
        <div className="h-6 bg-slate-200 rounded w-1/2 mb-2" />
        <div className="h-4 bg-slate-200 rounded w-2/3 mb-8" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 bg-slate-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data?.educator) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <h2 className="text-2xl font-bold text-slate-900">Eğitici yüklenemedi</h2>
        <p className="text-slate-500 mt-2">Lütfen daha sonra tekrar deneyin.</p>
        <div className="mt-6">
          <Link to={createPageUrl('Educators')}>
            <Button className="bg-indigo-600 hover:bg-indigo-700">Eğiticilere Dön</Button>
          </Link>
        </div>
      </div>
    );
  }

  const educator = data.educator;
  const stats = data.stats || {};
  const tests = data.tests?.items || [];

  return (
    <div className="max-w-6xl mx-auto">
      <Link
        to={createPageUrl('Educators')}
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Eğiticilere Dön
      </Link>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-slate-900">{educator.displayName}</h1>
            {educator.bio && <p className="text-slate-600 max-w-2xl">{educator.bio}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-slate-100 text-slate-700">
                <BookOpen className="w-4 h-4 mr-2" />
                {stats.totalPublishedTests ?? tests.length} test
              </Badge>
              <Badge className="bg-amber-100 text-amber-700">
                <Star className="w-4 h-4 mr-2" />
                {stats.ratingAvg != null ? Number(stats.ratingAvg).toFixed(1) : '0.0'} ({stats.ratingCount ?? 0})
              </Badge>
              {stats.totalPurchases != null && (
                <Badge className="bg-indigo-100 text-indigo-700">
                  <Users className="w-4 h-4 mr-2" />
                  {stats.totalPurchases} satış
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {tests.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Bu eğiticinin yayında testi yok.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((t) => (
            <TestPackageCard
              key={t.id}
              test={{
                id: t.id,
                title: t.title,
                educator_email: educator.id,
                educator_name: educator.displayName,
                exam_type_id: t.examTypeId,
                question_count: t.questionCount,
                price: t.priceCents != null ? t.priceCents / 100 : 0,
                average_rating: t.ratingAvg,
                rating_count: t.ratingCount,
                is_published: true,
                is_active: true,
              }}
              isPurchased={false}
              isCompleted={false}
              onBuy={() => navigate(buildPageUrl('TestDetail', { id: t.id }))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

