import { useState, useRef, useCallback } from "react";
import html2canvas from "html2canvas";
import { entities } from "@/api/dalClient";
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
  Filter,
  AlertTriangle,
  Share2,
  Download,
  ChevronDown,
} from "lucide-react";

const PAGE_SIZE = 15;

/** Filtrelenmiş sonuçları XLSX olarak indirir */
async function exportToXLSX(rows, safeFormatDate) {
  const XLSX = await import("xlsx");
  const data = rows.map((r) => ({
    "Test": r.test_package_title || r.test_title || "Test",
    "Puan": r.score ?? 0,
    "Doğru": r.correct_count ?? 0,
    "Yanlış": r.wrong_count ?? 0,
    "Boş": r.empty_count ?? 0,
    "Toplam Soru": r.question_count ?? "",
    "Süre (dk)": r.time_spent_seconds ? Math.floor(r.time_spent_seconds / 60) : "",
    "Tarih": safeFormatDate(r.created_date),
    "Gecikme (sn)": r.overtime_seconds ?? 0,
    "Durum": r.score >= 80 ? "Mükemmel" : r.score >= 60 ? "İyi" : r.score >= 40 ? "Orta" : "Geliştirilmeli",
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sonuçlarım");
  XLSX.writeFile(wb, `sinav-salonu-sonuclar-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export default function MyResults() {
  const { user } = useAuth();
  const shareRef = useRef(null);
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = useCallback(async () => {
    if (!shareRef.current || isSharing) return;
    setIsSharing(true);
    try {
      const canvas = await html2canvas(shareRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      });

      // "Sınav Salonu" imzası — sadece paylaşılan görselde
      const ctx = canvas.getContext("2d");
      const scale = 2;
      const stripH = 40 * scale;
      ctx.fillStyle = "rgba(99,102,241,0.08)";
      ctx.fillRect(0, canvas.height - stripH, canvas.width, stripH);
      ctx.font = `600 ${13 * scale}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = "#6366f1";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText("Sınav Salonu", canvas.width - 20 * scale, canvas.height - stripH / 2);

      canvas.toBlob(async (blob) => {
        const file = new File([blob], "sinav-salonu-rapor.png", { type: "image/png" });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: "Sınav Salonu Raporun" });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "sinav-salonu-rapor.png";
          a.click();
          URL.revokeObjectURL(url);
        }
      }, "image/png");
    } catch {
      // sessizce geç
    } finally {
      setIsSharing(false);
    }
  }, [isSharing]);

  const [filterTest, setFilterTest] = useState("all");
  const [filterTimeRange, setFilterTimeRange] = useState("all");
  const [filterExamType, setFilterExamType] = useState("all");
  const [chartType, setChartType] = useState("performance");
  const [page, setPage] = useState(1);

  const { data: examTypes = [] } = useQuery({
    queryKey: ["examTypes"],
    queryFn: () => entities.ExamType.filter({ is_active: true }),
  });
  const examTypeMap = Object.fromEntries(examTypes.map(e => [e.id, e.name]));

  const { data: rawResults, isLoading, isError } = useQuery({
    queryKey: ["myResults", user?.id],
    queryFn: () => entities.TestResult.filter({ user_email: user?.email }),
    enabled: !!user,
  });

  // API bazen { data: [...] } dönebilir; her zaman dizi kullan
  const results = Array.isArray(rawResults)
    ? rawResults
    : (Array.isArray(rawResults?.data) ? rawResults.data : []);

  // Sonuçlardan benzersiz sınav türleri — isim examTypeMap'ten çözülür
  const uniqueExamTypes = [...new Map(
    results.filter(r => r.exam_type_id).map(r => [
      r.exam_type_id,
      { id: r.exam_type_id, name: examTypeMap[r.exam_type_id] || r.exam_type_name || r.exam_type_id }
    ])
  ).values()];

  // Filter results (güvenli tarih ve id erişimi)
  const filteredResults = results.filter((r) => {
    if (filterTest !== "all" && r.test_package_id !== filterTest) return false;
    if (filterExamType !== "all" && r.exam_type_id !== filterExamType) return false;
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

  // Gecikmeli teslim edilen testleri filtrele — "gelişime açık" bölümü için
  const overtimeResults = filteredResults.filter((r) => r.overtime_seconds > 0);

  // Süre aşımını okunabilir göster (örn: "2 dk 15 sn")
  const formatOvertime = (seconds) => {
    if (!seconds) return "-";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s} sn`;
    if (s === 0) return `${m} dk`;
    return `${m} dk ${s} sn`;
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
      <div className="mb-6 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-4 flex-wrap">
            <Filter className="w-5 h-5 text-slate-500" />
            <Select value={filterTest} onValueChange={setFilterTest}>
              <SelectTrigger aria-label="Test paketi filtresi" className="w-64">
                <SelectValue placeholder="Tüm Paketler" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Paketler</SelectItem>
                {uniquePackages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>{pkg.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterExamType} onValueChange={setFilterExamType}>
              <SelectTrigger aria-label="Sınav türü filtresi" className="w-48">
                <SelectValue placeholder="Tüm Sınav Türleri" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Sınav Türleri</SelectItem>
                {uniqueExamTypes.map((et) => (
                  <SelectItem key={et.id} value={et.id}>{et.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterTimeRange} onValueChange={setFilterTimeRange}>
              <SelectTrigger aria-label="Zaman aralığı filtresi" className="w-48">
                <SelectValue placeholder="Tüm Zamanlar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Zamanlar</SelectItem>
                <SelectItem value="week">Son 1 Hafta</SelectItem>
                <SelectItem value="month">Son 1 Ay</SelectItem>
                <SelectItem value="3months">Son 3 Ay</SelectItem>
              </SelectContent>
            </Select>
            {(filterTest !== "all" || filterExamType !== "all" || filterTimeRange !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterTest("all");
                  setFilterExamType("all");
                  setFilterTimeRange("all");
                  setPage(1);
                }}
              >
                Filtreleri Temizle
              </Button>
            )}
          </div>
      </div>

      {/* Paylaş butonu — paylaşılabilir alanın sağ üstünde, dışında */}
      <div className="flex justify-end mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleShare}
          disabled={isSharing}
          className="text-indigo-600 hover:text-indigo-700"
        >
          <Share2 className="w-4 h-4 mr-1.5" />
          {isSharing ? "Hazırlanıyor…" : "Paylaş"}
        </Button>
      </div>

      {/* Stats + Grafik paylaşılabilir alan */}
      <div ref={shareRef} className="bg-white rounded-xl p-4 -mx-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Toplam Test"
          value={stats.totalTests}
          icon={BarChart3}
          iconColor="text-indigo-500"
        />
        <StatCard
          title="Ortalama Puan"
          value={stats.avgScore}
          icon={TrendingUp}
          iconColor="text-violet-500"
        />
        <StatCard
          title="Toplam Doğru"
          value={stats.totalCorrect}
          icon={CheckCircle}
          iconColor="text-emerald-500"
        />
        <StatCard
          title="Toplam Yanlış"
          value={stats.totalWrong}
          icon={XCircle}
          iconColor="text-rose-500"
        />
      </div>

      {/* Performance Chart */}
      {results.length > 0 && (
        <div className="mb-6 pb-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800">Gelişim</h2>
            <div data-html2canvas-ignore="true">
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger aria-label="Grafik türü seçimi" className="w-40 shrink-0">
                  <span className="truncate text-sm">
                    {chartType === "performance" ? "Performans" : chartType === "questions" ? "Çözülen Soru" : "Çalışma Süresi"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="performance">Performans</SelectItem>
                  <SelectItem value="questions">Çözülen Soru</SelectItem>
                  <SelectItem value="time">Çalışma Süresi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            </div>
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
        </div>
      )}

      </div>{/* /shareRef */}

      {/* Results Table */}
      <div className="pb-6 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-800">
            Test Geçmişi
            {filteredResults.length > 0 && (
              <span className="ml-2 text-sm font-normal text-slate-500">({filteredResults.length})</span>
            )}
          </h2>
          {filteredResults.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => exportToXLSX(filteredResults, safeFormatDate)}
              className="text-slate-500 hover:text-slate-700"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Excel'e Aktar
            </Button>
          )}
        </div>
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
            <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test</TableHead>
                    <TableHead className="text-center">Puan</TableHead>
                    <TableHead className="text-center">D / Y / B</TableHead>
                    <TableHead className="text-center">Süre</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead className="text-center">Gecikme</TableHead>
                    <TableHead>Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.slice(0, page * PAGE_SIZE).map((result, idx) => {
                    const answeredSum = (result.correct_count ?? 0) + (result.wrong_count ?? 0) + (result.empty_count ?? 0);
                    const total = result.question_count ?? (answeredSum > 0 ? answeredSum : null);
                    const mins = result.time_spent_seconds ? Math.floor(result.time_spent_seconds / 60) : null;
                    const secs = result.time_spent_seconds ? result.time_spent_seconds % 60 : null;
                    return (
                    <TableRow key={result?.id ? String(result.id) : "row-" + idx}>
                      <TableCell className="font-medium">
                        {getTestTitle(result)}
                        {total && <span className="ml-1 text-xs text-slate-500">({total} soru)</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold text-lg">{result.score}</span>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        <span className="text-emerald-600 font-medium">{result.correct_count ?? 0}</span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="text-rose-500 font-medium">{result.wrong_count ?? 0}</span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="text-slate-500">{result.empty_count ?? 0}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {mins !== null ? (
                          <div className="flex items-center justify-center gap-1 text-slate-500 text-sm">
                            <Clock className="w-3.5 h-3.5" />
                            {mins >= 60
                              ? `${Math.floor(mins / 60)}sa ${mins % 60}dk`
                              : `${mins}dk ${secs}s`}
                          </div>
                        ) : <span className="text-slate-400">—</span>}
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        {safeFormatDate(result.created_date)}
                      </TableCell>
                      <TableCell className="text-center">
                        {result.overtime_seconds > 0 ? (
                          <Badge className="bg-amber-100 text-amber-700 gap-1">
                            <Clock className="w-3 h-3" />
                            +{formatOvertime(result.overtime_seconds)}
                          </Badge>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getScoreBadge(result.score ?? 0)}
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {filteredResults.length > page * PAGE_SIZE && (
              <div className="flex justify-center mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  className="text-slate-600"
                >
                  <ChevronDown className="w-4 h-4 mr-1.5" />
                  Daha Fazla Göster ({filteredResults.length - page * PAGE_SIZE} kaldı)
                </Button>
              </div>
            )}
            </>
          )}
      </div>

      {/* ─── Gelişime Açık Yönler — süre aşımı olan testler ─── */}
      {overtimeResults.length > 0 && (
        <div className="mt-6 pt-6 border-t border-amber-200">
          <h2 className="flex items-center gap-2 text-amber-800 text-base font-semibold mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Gelişime Açık Yön: Süre Yönetimi
          </h2>
            <p className="text-sm text-amber-700 mb-4">
              Aşağıdaki {overtimeResults.length} testte izin verilen süreden daha geç teslim yaptın.
              Sınav koşullarında gecikmeli teslim mümkün değildir — süre yönetimine odaklanmak
              performansını önemli ölçüde artırabilir.
            </p>
            <div className="space-y-2">
              {overtimeResults.map((result, idx) => (
                <div
                  key={result?.id ? String(result.id) : "ot-" + idx}
                  className="flex items-center justify-between bg-white border border-amber-200 rounded-xl px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{getTestTitle(result)}</p>
                    <p className="text-xs text-slate-500">{safeFormatDate(result.created_date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Gecikme</p>
                      <p className="text-sm font-bold text-amber-700">
                        +{formatOvertime(result.overtime_seconds)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Puan</p>
                      <p className="text-sm font-bold text-slate-700">{result.score}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-amber-600 mt-4 italic">
              💡 İpucu: Her soruya ortalama {Math.round((filteredResults[0]?.time_spent_seconds ?? 0) / Math.max(1, (filteredResults[0]?.correct_count ?? 0) + (filteredResults[0]?.wrong_count ?? 0))) || "?"} saniye ayırmayı hedefle. Zorlandığın soruları işaretleyip geç, sonunda dön.
            </p>
        </div>
      )}
    </div>
  );
}