import { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildPageUrl, useAppNavigate } from "@/lib/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TestPackageCard from "@/components/ui/TestPackageCard";
import { 
  GraduationCap, 
  Search, 
  TrendingUp, 
  Users, 
  BookOpen, 
  Award,
  ArrowRight,
  CheckCircle,
  Star,
  User,
  UserCircle,
  Briefcase
} from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const navigate = useAppNavigate();

  const { data: examTypes = [] } = useQuery({
    queryKey: ["examTypes"],
    queryFn: () => base44.entities.ExamType.filter({ is_active: true }),
  });

  const { data: allPurchases = [] } = useQuery({
    queryKey: ["allPurchases", user?.email],
    queryFn: () => base44.entities.Purchase.filter({ user_email: user?.email }),
    enabled: !!user,
  });

  const { data: allTests = [] } = useQuery({
    queryKey: ["allPublishedTests"],
    queryFn: () => base44.entities.TestPackage.filter({ is_published: true, is_active: true }),
  });

  // Tests already have question_count from API
  const enrichedTests = allTests;

  // Featured tests - öncelikle kullanıcının ilgilendiği sınavlar, sonra popüler olanlar
  const featuredTests = (() => {
    const userInterests = user?.interested_exam_types || [];
    
    if (userInterests.length > 0) {
      // Kullanıcının ilgilendiği sınavlara ait testler
      const interestedTests = enrichedTests.filter(test => 
        userInterests.includes(test.exam_type_id)
      );
      
      // Diğer testler
      const otherTests = enrichedTests.filter(test => 
        !userInterests.includes(test.exam_type_id)
      );
      
      // İlgilenilen testleri önce göster (satışa göre sırala), sonra diğerleri
      return [
        ...interestedTests.sort((a, b) => (b.total_sales || 0) - (a.total_sales || 0)),
        ...otherTests.sort((a, b) => (b.total_sales || 0) - (a.total_sales || 0))
      ].slice(0, 6);
    }
    
    // Kullanıcı tercih yapmamışsa, en çok satanları göster
    return enrichedTests
      .sort((a, b) => (b.total_sales || 0) - (a.total_sales || 0))
      .slice(0, 6);
  })();

  // Get top educators
  const topEducators = Object.values(
    allTests.reduce((acc, test) => {
      if (!acc[test.educator_email]) {
        acc[test.educator_email] = {
          email: test.educator_email,
          name: test.educator_name,
          testCount: 0,
          totalSales: 0,
          avgRating: 0,
          ratingCount: 0,
        };
      }
      acc[test.educator_email].testCount++;
      acc[test.educator_email].totalSales += test.total_sales || 0;
      if (test.average_rating > 0) {
        acc[test.educator_email].avgRating += test.average_rating;
        acc[test.educator_email].ratingCount++;
      }
      return acc;
    }, {})
  ).map((edu) => ({
    ...edu,
    avgRating: edu.ratingCount > 0 ? (edu.avgRating / edu.ratingCount).toFixed(1) : 0,
  }))
  .sort((a, b) => b.totalSales - a.totalSales)
  .slice(0, 6);

  const { data: purchases = [] } = useQuery({
    queryKey: ["purchases", user?.email],
    queryFn: () => user ? base44.entities.Purchase.filter({ user_email: user.email }) : [],
    enabled: !!user,
  });

  const { data: results = [] } = useQuery({
    queryKey: ["results", user?.email],
    queryFn: () => user ? base44.entities.TestResult.filter({ user_email: user.email }) : [],
    enabled: !!user,
  });

  const purchasedIds = new Set(purchases.map(p => p.test_package_id));
  const completedIds = new Set(results.map(r => r.test_package_id));

  // Calculate popularity based on purchases
  const examTypePopularity = allPurchases.reduce((acc, purchase) => {
    const test = allTests.find(t => t.id === purchase.test_package_id);
    if (test?.exam_type_id) {
      acc[test.exam_type_id] = (acc[test.exam_type_id] || 0) + 1;
    }
    return acc;
  }, {});

  // Sort exam types by popularity
  const sortedExamTypes = [...examTypes].sort((a, b) => {
    const aCount = examTypePopularity[a.id] || 0;
    const bCount = examTypePopularity[b.id] || 0;
    return bCount - aCount;
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(buildPageUrl("Explore", { q: searchQuery.trim() }));
  };

  const handleLogin = (userType) => {
    sessionStorage.setItem('preferred_user_type', userType);
    navigate(buildPageUrl("Login", { from: createPageUrl("Explore") }));
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header - sidebar is provided by Layout when user is logged in */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{backgroundColor: '#0000CD'}}>
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">Sınav Salonu</span>
            </div>
            <nav className="flex items-center gap-3">
              <Link to={createPageUrl("Explore")} className="text-slate-600 hover:text-slate-900 transition-colors">
                Testleri Keşfet
              </Link>
              {!user && (
                <Button 
                 onClick={() => setShowLoginDialog(true)}
                 style={{backgroundColor: '#0000CD'}}
                 className="hover:opacity-90"
                >
                  Giriş Yap
                </Button>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundColor: '#0000CD' }} />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1920')] bg-cover bg-center opacity-10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
              Sınavlara
              <span className="block text-indigo-200">Güvenle Hazırlan</span>
            </h1>
            <p className="mt-6 text-lg text-indigo-100 max-w-xl">
              Alanında uzman eğiticilerden binlerce test çöz, performansını takip et ve hedefine ulaş.
            </p>
            
            <form onSubmit={handleSearch} className="mt-10 flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Test, konu veya eğitici ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-14 bg-white/95 backdrop-blur border-0 rounded-xl text-lg"
                />
              </div>
              <Button type="submit" size="lg" className="h-14 px-8 bg-white hover:bg-slate-100 rounded-xl" style={{color: '#0000CD'}}>
                Ara
              </Button>
            </form>

            <div className="mt-10 flex flex-wrap gap-6 text-white/90">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span>10,000+ Test</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span>500+ Eğitici</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span>100,000+ Aday</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Exam Types */}
      {examTypes.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Sınav Türleri</h2>
            <Link 
              to={createPageUrl("ExamTypes")} 
              className="flex items-center gap-2 font-medium hover:opacity-80"
              style={{color: '#0000CD'}}
            >
              Tümünü Gör <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="bg-white rounded-xl overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x" style={{borderColor: 'rgba(0, 0, 205, 0.2)'}}>
            {sortedExamTypes.slice(0, 6).map((exam) => (
              <Link
                key={exam.id}
                to={createPageUrl("Explore") + `?exam_type=${exam.id}`}
                className="group p-6 hover:bg-slate-50 transition-all text-center"
              >
                <div className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{backgroundColor: 'rgba(0, 0, 205, 0.1)'}}>
                  <Award className="w-6 h-6" style={{color: '#0000CD'}} />
                </div>
                <p className="mt-3 font-semibold text-slate-900">{exam.name}</p>
              </Link>
            ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Tests */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Öne Çıkan Testler</h2>
          <Link 
            to={createPageUrl("Explore")} 
            className="flex items-center gap-2 font-medium hover:opacity-80"
            style={{color: '#0000CD'}}
          >
            Tümünü Gör <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredTests.map((test) => (
            <TestPackageCard
              key={test.id}
              test={test}
              isPurchased={user && purchasedIds.has(test.id)}
              isCompleted={user && completedIds.has(test.id)}
              onBuy={() => navigate(buildPageUrl("TestDetail", { id: test.id }))}
            />
          ))}
        </div>
      </section>

      {/* Featured Educators */}
      {topEducators.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Öne Çıkan Eğiticiler</h2>
            <Link 
              to={createPageUrl("Educators")} 
              className="flex items-center gap-2 font-medium hover:opacity-80"
              style={{color: '#0000CD'}}
            >
              Tümünü Gör <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="bg-white rounded-xl overflow-hidden">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3">
            {topEducators.map((educator) => (
              <Link
                key={educator.email}
                to={createPageUrl("EducatorProfile") + `?email=${encodeURIComponent(educator.email)}`}
                className="group p-6 hover:bg-slate-50 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-8 h-8 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                      {educator.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        <span>{educator.testCount} Test</span>
                      </div>
                      {educator.avgRating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          <span>{educator.avgRating}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 text-xs text-slate-400">
                      {educator.totalSales} satış
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            </div>
          </div>
        </section>
      )}

      {/* Stats */}
      <section className="py-20" style={{ backgroundColor: '#0000CD' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 divide-x divide-white/20">
            {[
              { icon: Users, value: "100,000+", label: "Aktif Aday" },
              { icon: BookOpen, value: "10,000+", label: "Test Paketi" },
              { icon: GraduationCap, value: "500+", label: "Uzman Eğitici" },
              { icon: TrendingUp, value: "%85", label: "Başarı Oranı" },
            ].map((stat, idx) => (
              <div key={idx} className="text-center p-8">
                <div className="w-14 h-14 mx-auto bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                  <stat.icon className="w-7 h-7 text-white" strokeWidth={1.5} />
                </div>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
                <p className="text-white/70 mt-1">{stat.label}</p>
              </div>
            ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Aday Olarak Katıl */}
            <div className="rounded-3xl p-12 text-center" style={{ backgroundColor: '#0000CD' }}>
              <h2 className="text-3xl font-bold text-white mb-4">
                Aday Olarak Katıl
              </h2>
              <p className="text-white/80 max-w-xl mx-auto mb-8">
                Alanında uzman eğiticilerden binlerce test çöz,<br />performansını takip et ve hedefine ulaş.
              </p>
              <Button 
                size="lg" 
                className="bg-white hover:bg-slate-100"
                style={{color: '#0000CD'}}
                onClick={() => {
                  sessionStorage.setItem('preferred_user_type', 'candidate');
                  navigate(createPageUrl("Login"));
                }}
              >
                Hemen Başla
              </Button>
            </div>

            {/* Eğitici Olarak Katıl */}
            <div className="rounded-3xl p-12 text-center" style={{ backgroundColor: '#0000CD' }}>
              <h2 className="text-3xl font-bold text-white mb-4">
                Eğitici Olarak Katıl
              </h2>
              <p className="text-white/80 max-w-xl mx-auto mb-8">
                Uzman olduğun konuda test paketleri oluştur,<br />binlerce adaya ulaş ve gelir elde et.
              </p>
              <Button 
                size="lg" 
                className="bg-white hover:bg-slate-100"
                style={{color: '#0000CD'}}
                onClick={() => {
                  sessionStorage.setItem('preferred_user_type', 'educator');
                  navigate(createPageUrl("Login"));
                }}
              >
                Hemen Başla
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="text-slate-400 py-12" style={{ backgroundColor: '#0000CD' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/10">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <span className="text-lg font-bold text-white">Sınav Salonu</span>
              </div>
              <p className="text-white/70 text-sm">
                Sınavlara hazırlık için en güvenilir platform.<br />
                Alanında uzman eğiticilerden test çöz,<br />
                performansını takip et.
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Kurumsal</h3>
              <div className="grid grid-cols-2 gap-3">
                <Link to={createPageUrl("About")} className="text-white/70 hover:text-white text-sm transition-colors">
                  Hakkımızda
                </Link>
                <Link to={createPageUrl("Contact")} className="text-white/70 hover:text-white text-sm transition-colors">
                  İletişim
                </Link>
                <Link to={createPageUrl("Privacy")} className="text-white/70 hover:text-white text-sm transition-colors">
                  Gizlilik Politikası
                </Link>
                <Link to={createPageUrl("Partnership")} className="text-white/70 hover:text-white text-sm transition-colors">
                  İş Ortaklığı
                </Link>
              </div>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Destek</h3>
              <Link to={createPageUrl("Support")} className="text-white/70 hover:text-white text-sm transition-colors block">
                Yardım ve Destek
              </Link>
            </div>
          </div>
          <div className="pt-8 border-t border-white/10">
            <p className="text-sm text-white/50 text-center">© 2024 Sınav Salonu. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </footer>

      {/* Login Type Selection Dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center">Sınav Salonu'na Hoş Geldiniz</DialogTitle>
            <DialogDescription className="text-center">
              Devam etmek için hesap türünüzü seçin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            <button
              onClick={() => handleLogin('candidate')}
              className="w-full p-6 rounded-xl border-2 border-slate-200 hover:bg-slate-50 transition-all group text-left"
              style={{borderColor: '#0000CD', color: '#0000CD'}}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#0000CD'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center group-hover:text-white transition-colors" style={{backgroundColor: 'rgba(0, 0, 205, 0.1)'}}  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0000CD'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 205, 0.1)'}>
                  <UserCircle className="w-6 h-6" style={{color: '#0000CD'}} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">Aday Olarak Giriş</h3>
                  <p className="text-sm text-slate-500">Test çöz ve performansını takip et</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => handleLogin('educator')}
              className="w-full p-6 rounded-xl border-2 border-slate-200 hover:bg-slate-50 transition-all group text-left"
              style={{borderColor: '#0000CD', color: '#0000CD'}}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#0000CD'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center group-hover:text-white transition-colors" style={{backgroundColor: 'rgba(0, 0, 205, 0.1)'}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0000CD'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 205, 0.1)'}>
                  <Briefcase className="w-6 h-6" style={{color: '#0000CD'}} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">Eğitici Olarak Giriş</h3>
                  <p className="text-sm text-slate-500">Test paketi oluştur ve gelir elde et</p>
                </div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}