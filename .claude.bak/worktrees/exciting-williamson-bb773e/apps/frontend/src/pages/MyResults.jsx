import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { tr } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatCard from "@/components/ui/StatCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp,
  Award,
  Filter
} from "lucide-react";

export default function MyResults() {
  const { user } = useAuth();
  const [filterTest, setFilterTest] = useState("all");
  const [filterTimeRange, setFilterTimeRange] = useState("all");
  const [chartType, setChartType] = useState("performance");

  const { data: rawResults, isLoading, isError } = useQuery({
    queryKey: ["myResults", user?.id],
    queryFn: () => base44.entities.TestResult.filter({ user_email: user?.email }),
    enabled: !!user,
  });

  // API bazen { data: [...] } dönebilir; her zaman dizi kullan
  const results = Array.isArray(rawResults)
    ? rawResults
    : (Array.isArray(rawResults?.data) ? rawResults.data : []);

  // Filter results (güvenli tarih ve id erişimi)
  const filteredResults = results.filter((r) => {
    if (filterTest !== "all" && r.test_package_id !== filterTest) return false;
    if (filterTimeRange !== "all" && r.created_date) {
      const createdDate = new Date(r.created_date);
      if (Number.isNaN(createdDate.getTime())) return true;
      const now = new Date();
      if (filterTimeRange === "week" && createdDate < subWeeks(now, 1)) return false;
      if (filterTimeRange === "month" && createdDate < subWeeks(now, 4)) return false;
      if (filterTimeRange === "3months" && createdDate < subWeeks(now, 12)) return false;
    }
    return true;
  });

  const stats = {
    totalTests: filteredResults.length,
    avgScore: filteredResults.length > 0
      ? Math.round(filteredResults.reduce((sum, r) => sum + (r.score ?? 0), 0) / filteredResults.length)
      : 0,
    totalCorrect: filteredResults.reduce((sum, r) => sum + (r.correct_count ?? 0), 0),
    totalWrong: filteredResults.reduce((sum, r) => sum + (r.wrong_count ?? 0), 0),
  };

  // Weekly performance data
  const weeklyData = [];
  for (let i = 6; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekResults = results.filter((r) => {
      if (!r.created_date) return false;
      const d = new Date(r.created_date);
      return !Number.isNaN(d.getTime()) && d >= weekStart && d <= weekEnd;
    });
    const avgScore = weekResults.length > 0
      ? Math.round(weekResults.reduce((sum, r) => sum + r.score, 0) / weekResults.length)
      : 0;
    const totalQuestions = weekResults.reduce((sum, r) => sum + (r.correct_count + r.wrong_count + (r.empty_count || 0)), 0);
    const totalTimeMinutes = Math.round(weekResults.reduce((sum, r) => sum + (r.time_spent_seconds || 0), 0) / 60);
    
    weeklyData.push({
      week: format(weekStart, "d MMM", { locale: tr }),
      score: avgScore,
      count: weekResults.length,
      questions: totalQuestions,
      timeMinutes: totalTimeMinutes
    });
  }

  // Get unique test packages for filter (undefined id kullanma - Select hatası önlenir)
  const uniquePackages = [...new Set(results.map(r => r.test_package_id).filter(Boolean))].map(id => {
    const result = results.find(r => r.test_package_id === id);
    return { id: String(id), title: result?.test_package_title || "Test" };
  });

  // Get test title helper
  const getTestTitle = (result) =>
    result?.test_package_title || result?.test_title || "Test";

  const safeFormatDate = (dateVal) => {
    if (!dateVal) return "-";
    const d = new Date(dateVal);
    return Number.isNaN(d.getTime()) ? "-" : format(d, "d MMM yyyy", { locale: tr });
  };

  const getScoreBadge = (score) => {
    if (score >= 80) return <Badge className="bg-emerald-100 text-emerald-700">Mükemmel</Badge>;
    if (score >= 60) return <Badge className="bg-blue-100 text-blue-700">İyi</Badge>;
    if (score >= 40) return <Badge className="bg-amber-100 text-amber-700">Orta</Badge>;
    return <Badge className="bg-rose-100 text-rose-700">Geliştirilmeli</Badge>;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20 min-h-[200px]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Sonuçlar yüklenirken hata oluştu. Sayfayı yenileyin.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Sonuçlarım</h1>
        <p className="text-slate-500 mt-2">Test performansını takip et</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <Filter className="w-5 h-5 text-slate-500" />
            <Select value={filterTest} onValueChange={setFilterTest}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Tüm Paketler" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Paketler</SelectItem>
                {uniquePackages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>{pkg.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterTimeRange} onValueChange={setFilterTimeRange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tüm Zamanlar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Zamanlar</SelectItem>
                <SelectItem value="week">Son 1 Hafta</SelectItem>
                <SelectItem value="month">Son 1 Ay</SelectItem>
                <SelectItem value="3months">Son 3 Ay</SelectItem>
              </SelectContent>
            </Select>
            {(filterTest !== "all" || filterTimeRange !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterTest("all");
                  setFilterTimeRange("all");
                }}
              >
                Filtreleri Temizle
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Toplam Test"
          value={stats.totalTests}
          icon={BarChart3}
          bgColor="bg-indigo-500"
        />
        <StatCard
          title="Ortalama Puan"
          value={stats.avgScore}
          icon={TrendingUp}
          bgColor="bg-violet-500"
        />
        <StatCard
          title="Toplam Doğru"
          value={stats.totalCorrect}
          icon={CheckCircle}
          bgColor="bg-emerald-500"
        />
        <StatCard
          title="Toplam Yanlış"
          value={stats.totalWrong}
          icon={XCircle}
          bgColor="bg-rose-500"
        />
      </div>

      {/* Performance Chart */}
      {results.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Haftalık İstatistikler</CardTitle>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="performance">Performans</SelectItem>
                  <SelectItem value="questions">Çözülen Soru</SelectItem>
                  <SelectItem value="time">Çalışma Süresi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              {chartType === "performance" ? (
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
                            <p className="font-semibold">{payload[0].payload.week}</p>
                            <p className="text-indigo-600">Ortalama: {payload[0].value}</p>
                            <p className="text-slate-500 text-sm">Test Sayısı: {payload[0].payload.count}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#4f46e5" 
                    strokeWidth={3}
                    dot={{ fill: "#4f46e5", r: 4 }}
                  />
                </LineChart>
              ) : chartType === "questions" ? (
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
                            <p className="font-semibold">{payload[0].payload.week}</p>
                            <p className="text-emerald-600">Soru Sayısı: {payload[0].value}</p>
                            <p className="text-slate-500 text-sm">Test Sayısı: {payload[0].payload.count}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="questions" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ fill: "#10b981", r: 4 }}
                  />
                </LineChart>
              ) : (
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const hours = Math.floor(payload[0].value / 60);
                        const minutes = payload[0].value % 60;
                        return (
                          <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
                            <p className="font-semibold">{payload[0].payload.week}</p>
                            <p className="text-violet-600">
                              Süre: {hours > 0 ? `${hours}sa ` : ''}{minutes}dk
                            </p>
                            <p className="text-slate-500 text-sm">Test Sayısı: {payload[0].payload.count}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="timeMinutes" 
                    stroke="#7c3aed" 
                    strokeWidth={3}
                    dot={{ fill: "#7c3aed", r: 4 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Test Geçmişi</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="text-center py-12">
              <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">
                {results.length === 0 ? "Henüz tamamlanmış test yok" : "Filtreye uygun sonuç bulunamadı"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test</TableHead>
                    <TableHead className="text-center">Puan</TableHead>
                    <TableHead className="text-center">Doğru</TableHead>
                    <TableHead className="text-center">Yanlış</TableHead>
                    <TableHead className="text-center">Boş</TableHead>
                    <TableHead className="text-center">Süre</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.map((result, idx) => (
                    <TableRow key={result?.id ? String(result.id) : "row-" + idx}>
                      <TableCell className="font-medium">
                        {getTestTitle(result)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold text-lg">{result.score}</span>
                      </TableCell>
                      <TableCell className="text-center text-emerald-600 font-medium">
                        {result.correct_count ?? "-"}
                      </TableCell>
                      <TableCell className="text-center text-rose-600 font-medium">
                        {result.wrong_count ?? "-"}
                      </TableCell>
                      <TableCell className="text-center text-slate-500">
                        {result.empty_count ?? "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 text-slate-500">
                          <Clock className="w-4 h-4" />
                          {result.time_spent_seconds 
                            ? `${Math.floor(result.time_spent_seconds / 60)}dk`
                            : "-"
                          }
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {safeFormatDate(result.created_date)}
                      </TableCell>
                      <TableCell>
                        {getScoreBadge(result.score ?? 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}