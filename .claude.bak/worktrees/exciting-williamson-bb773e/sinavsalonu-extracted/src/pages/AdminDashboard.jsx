import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatCard from "@/components/ui/StatCard";
import { 
  Users, 
  BookOpen, 
  ShoppingBag, 
  TrendingUp,
  Award,
  ArrowRight,
  UserCheck,
  GraduationCap
} from "lucide-react";

export default function AdminDashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {}
    };
    loadUser();
  }, []);

  const { data: users = [] } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => base44.entities.User.list(),
    enabled: user?.role === "admin",
  });

  const { data: tests = [] } = useQuery({
    queryKey: ["allTests"],
    queryFn: () => base44.entities.TestPackage.list(),
    enabled: user?.role === "admin",
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["allSales"],
    queryFn: () => base44.entities.Purchase.list("-created_date", 100),
    enabled: user?.role === "admin",
  });

  const { data: examTypes = [] } = useQuery({
    queryKey: ["examTypes"],
    queryFn: () => base44.entities.ExamType.list(),
    enabled: user?.role === "admin",
  });

  const educators = users.filter(u => u.user_type === "educator");
  const candidates = users.filter(u => u.user_type === "candidate" || !u.user_type);
  const publishedTests = tests.filter(t => t.is_published);
  const totalRevenue = sales.reduce((sum, s) => sum + (s.price_paid || 0), 0);

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-slate-900">Erişim Engellendi</h2>
        <p className="text-slate-500 mt-2">Bu sayfaya erişim yetkiniz yok</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Yönetim Paneli</h1>
        <p className="text-slate-500 mt-2">Platform genel bakış</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <StatCard
          title="Toplam Aday"
          value={candidates.length}
          icon={UserCheck}
          bgColor="bg-indigo-500"
        />
        <StatCard
          title="Toplam Eğitici"
          value={educators.length}
          icon={GraduationCap}
          bgColor="bg-purple-500"
        />
        <StatCard
          title="Toplam Test"
          value={tests.length}
          icon={BookOpen}
          bgColor="bg-violet-500"
        />
        <StatCard
          title="Toplam Satış"
          value={sales.length}
          icon={ShoppingBag}
          bgColor="bg-emerald-500"
        />
        <StatCard
          title="Toplam Gelir"
          value={`₺${totalRevenue.toLocaleString()}`}
          icon={TrendingUp}
          bgColor="bg-amber-500"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* User Stats */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Kullanıcılar</CardTitle>
            <Link to={createPageUrl("ManageUsers")} className="text-sm text-indigo-600 flex items-center gap-1">
              Yönet <ArrowRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <span className="text-slate-600">Adaylar</span>
                <span className="font-bold text-slate-900">{candidates.length}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <span className="text-slate-600">Eğiticiler</span>
                <span className="font-bold text-slate-900">{educators.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Stats */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Testler</CardTitle>
            <Link to={createPageUrl("ManageTests")} className="text-sm text-indigo-600 flex items-center gap-1">
              Yönet <ArrowRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <span className="text-slate-600">Yayında</span>
                <span className="font-bold text-emerald-600">{publishedTests.length}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <span className="text-slate-600">Taslak</span>
                <span className="font-bold text-slate-600">{tests.length - publishedTests.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exam Types */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Sınav Türleri</CardTitle>
            <Link to={createPageUrl("ManageExamTypes")} className="text-sm text-indigo-600 flex items-center gap-1">
              Yönet <ArrowRight className="w-4 h-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {examTypes.slice(0, 5).map((exam) => (
                <div key={exam.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-indigo-600" />
                    <span className="text-slate-700">{exam.name}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    exam.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                  }`}>
                    {exam.is_active ? "Aktif" : "Pasif"}
                  </span>
                </div>
              ))}
              {examTypes.length === 0 && (
                <p className="text-center text-slate-500 py-4">Sınav türü yok</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}