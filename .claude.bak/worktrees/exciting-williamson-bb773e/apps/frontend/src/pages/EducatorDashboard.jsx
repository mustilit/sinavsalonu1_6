import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatCard from "@/components/ui/StatCard";
import { 
  Plus, 
  BookOpen, 
  ShoppingBag, 
  TrendingUp, 
  Users,
  ArrowRight,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export default function EducatorDashboard() {
  const { user } = useAuth();

  const { data: myTests = [], isLoading: loadingTests } = useQuery({
    queryKey: ["myTests", user?.email],
    queryFn: () => base44.entities.TestPackage.filter({ educator_owns: true }, "-created_date"),
    enabled: !!user,
  });

  const { data: allQuestions = [] } = useQuery({
    queryKey: ["allQuestions"],
    queryFn: () => base44.entities.Question.list(),
    enabled: !!user,
  });

  // Calculate real question counts
  const questionCounts = allQuestions.reduce((acc, q) => {
    acc[q.test_package_id] = (acc[q.test_package_id] || 0) + 1;
    return acc;
  }, {});

  // Enrich tests with real question counts
  const testsWithRealCounts = myTests.map(test => ({
    ...test,
    question_count: questionCounts[test.id] || 0
  }));

  const { data: sales = [], isLoading: loadingSales } = useQuery({
    queryKey: ["mySales", user?.email],
    queryFn: () => base44.entities.Purchase.filter({ educator_email: user.email }, "-created_date"),
    enabled: !!user,
  });

  const totalRevenue = sales.reduce((sum, s) => sum + (s.price_paid || 0), 0);
  const publishedTests = myTests.filter(t => t.is_published).length;
  const recentSales = sales.slice(0, 5);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Hoş Geldin, {user?.full_name?.split(" ")[0]}</h1>
          <p className="text-slate-500 mt-2">Eğitici panelinize genel bakış</p>
        </div>
        <Link to={createPageUrl("CreateTest")}>
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" />
            Yeni Test Oluştur
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Toplam Test"
          value={myTests.length}
          icon={BookOpen}
          bgColor="bg-indigo-500"
        />
        <StatCard
          title="Yayında"
          value={publishedTests}
          icon={Eye}
          bgColor="bg-emerald-500"
        />
        <StatCard
          title="Toplam Satış"
          value={sales.length}
          icon={ShoppingBag}
          bgColor="bg-violet-500"
        />
        <StatCard
          title="Toplam Gelir"
          value={`₺${totalRevenue.toLocaleString()}`}
          icon={TrendingUp}
          bgColor="bg-amber-500"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Tests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Son Testlerim</CardTitle>
            <Link to={createPageUrl("MyTestPackages")} className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              Tümü <ArrowRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {loadingTests ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : myTests.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 mb-4">Henüz test oluşturmadınız</p>
                <Link to={createPageUrl("CreateTest")}>
                  <Button size="sm" variant="outline">İlk Testini Oluştur</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {testsWithRealCounts.slice(0, 5).map((test) => (
                  <Link 
                    key={test.id} 
                    to={createPageUrl("EditTest") + `?id=${test.id}`}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{test.title}</p>
                      <p className="text-sm text-slate-500">{test.question_count || 0} soru</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">₺{test.price}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        test.is_published 
                          ? "bg-emerald-100 text-emerald-700" 
                          : "bg-slate-200 text-slate-600"
                      }`}>
                        {test.is_published ? "Yayında" : "Taslak"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Son Satışlar</CardTitle>
            <Link to={createPageUrl("MySales")} className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              Tümü <ArrowRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            {loadingSales ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : sales.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Henüz satış yok</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentSales.map((sale) => (
                  <div 
                    key={sale.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{sale.user_name || "Kullanıcı"}</p>
                        <p className="text-sm text-slate-500 truncate max-w-[150px]">
                          {sale.test_package_title}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-emerald-600">+₺{sale.price_paid}</p>
                      <p className="text-xs text-slate-500">
                        {sale.created_date && format(new Date(sale.created_date), "d MMM", { locale: tr })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}