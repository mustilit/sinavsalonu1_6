import { useState } from "react";
import api from "@/lib/api/apiClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination } from "@/components/ui/Pagination";
import { AlertTriangle, BarChart3, MessageSquare, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const statusConfig = {
  OPEN:      { label: "Beklemede",           color: "bg-amber-100 text-amber-700" },
  ANSWERED:  { label: "Yanıtlandı",          color: "bg-emerald-100 text-emerald-700" },
  ESCALATED: { label: "Yöneticiye İletildi", color: "bg-violet-100 text-violet-700" },
};

export default function AdminObjections() {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [statsPage, setStatsPage] = useState(1);
  const [statsPageSize, setStatsPageSize] = useState(25);

  /* All objections – enriched */
  const { data: all = [], isLoading: loadingAll } = useQuery({
    queryKey: ["adminObjectionsAll", statusFilter],
    queryFn: async () => {
      const params = statusFilter !== "ALL" ? `?status=${statusFilter}` : "";
      const { data } = await api.get(`/admin/objections/all${params}`);
      return Array.isArray(data) ? data : [];
    },
  });

  /* Test-level stats */
  const { data: stats = [], isLoading: loadingStats } = useQuery({
    queryKey: ["adminObjectionStats"],
    queryFn: async () => {
      const { data } = await api.get("/admin/objections/test-stats");
      return Array.isArray(data) ? data : [];
    },
  });

  const totalOpen      = stats.reduce((s, t) => s + t.openCount, 0);
  const totalAnswered  = stats.reduce((s, t) => s + t.answeredCount, 0);
  const totalEscalated = stats.reduce((s, t) => s + t.escalatedCount, 0);
  const totalAll       = stats.reduce((s, t) => s + t.totalCount, 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Hata Bildirimleri — Yönetim</h1>
        <p className="text-slate-500 mt-2">Tüm adaylardan gelen soru itirazlarını görüntüle</p>
      </div>

      {/* Özet kartlar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Toplam",          value: totalAll,       color: "text-slate-800",   bg: "bg-slate-50"    },
          { label: "Beklemede",       value: totalOpen,      color: "text-amber-700",   bg: "bg-amber-50"    },
          { label: "Yanıtlandı",      value: totalAnswered,  color: "text-emerald-700", bg: "bg-emerald-50"  },
          { label: "İletildi",        value: totalEscalated, color: "text-violet-700",  bg: "bg-violet-50"   },
        ].map(({ label, value, color, bg }) => (
          <Card key={label} className={`${bg} border-0`}>
            <CardContent className="p-5">
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">
            <MessageSquare className="w-4 h-4 mr-1.5" />
            Tüm Bildirimler
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="w-4 h-4 mr-1.5" />
            Test Raporu
          </TabsTrigger>
        </TabsList>

        {/* ── Tüm Bildirimler ── */}
        <TabsContent value="all">
          <div className="flex items-center gap-3 mb-4">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-48 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tüm Durumlar</SelectItem>
                <SelectItem value="OPEN">Beklemede</SelectItem>
                <SelectItem value="ANSWERED">Yanıtlandı</SelectItem>
                <SelectItem value="ESCALATED">İletildi</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-slate-500">{all.length} bildirim</span>
          </div>

          {loadingAll ? (
            <div className="space-y-3">
              {[1, 2, 4].map(i => <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />)}
            </div>
          ) : all.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-slate-400">Bildirim bulunamadı</CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-3">
              {all.slice((page - 1) * pageSize, page * pageSize).map(obj => (
                <Card key={obj.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-slate-100 shrink-0">
                        <AlertTriangle className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge className={statusConfig[obj.status]?.color ?? "bg-slate-100 text-slate-700"}>
                            {statusConfig[obj.status]?.label ?? obj.status}
                          </Badge>
                          <span className="text-sm font-semibold text-slate-800 truncate">{obj.testTitle}</span>
                          {obj.educatorName && (
                            <span className="text-xs text-slate-400">• {obj.educatorName}</span>
                          )}
                        </div>
                        {obj.questionContent && (
                          <p className="text-sm text-slate-500 italic line-clamp-1 mb-1">
                            "{obj.questionContent}"
                          </p>
                        )}
                        <p className="text-sm text-slate-700">{obj.reason}</p>
                        {obj.answerText && (
                          <div className="mt-2 p-3 bg-emerald-50 rounded border border-emerald-100">
                            <p className="text-xs text-emerald-700 font-semibold mb-1">Eğitici Yanıtı:</p>
                            <p className="text-sm text-slate-700">{obj.answerText}</p>
                          </div>
                        )}
                        <div className="flex gap-4 mt-2 text-xs text-slate-400 flex-wrap">
                          <span>Bildiren: {obj.reporterName}</span>
                          <span>{format(new Date(obj.createdAt), "d MMM yyyy HH:mm", { locale: tr })}</span>
                          {obj.answeredAt && (
                            <span>
                              Yanıtlandı: {format(new Date(obj.answeredAt), "d MMM yyyy", { locale: tr })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
              <Pagination page={page} pageSize={pageSize} total={all.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
            </>
          )}
        </TabsContent>

        {/* ── Test Raporu ── */}
        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                En Çok Bildirim Alan Testler
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingStats ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />)}
                </div>
              ) : stats.length === 0 ? (
                <p className="text-center text-slate-400 py-8">Henüz bildirim yok</p>
              ) : (
                <>
                <div className="divide-y">
                  {stats.slice((statsPage - 1) * statsPageSize, statsPage * statsPageSize).map((s, idx) => (
                    <div key={s.testId} className="flex items-center gap-4 px-6 py-4">
                      <span className={`text-xl font-bold w-8 shrink-0 ${idx < 3 ? "text-rose-500" : "text-slate-300"}`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{s.testTitle}</p>
                        {s.educatorName && (
                          <p className="text-xs text-slate-400">{s.educatorName}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-xs">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">
                          {s.totalCount} toplam
                        </span>
                        {s.openCount > 0 && (
                          <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                            {s.openCount} bekliyor
                          </span>
                        )}
                        {s.answeredCount > 0 && (
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                            {s.answeredCount} yanıtlandı
                          </span>
                        )}
                        {s.escalatedCount > 0 && (
                          <span className="bg-violet-100 text-violet-700 px-2 py-0.5 rounded">
                            {s.escalatedCount} iletildi
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <Pagination page={statsPage} pageSize={statsPageSize} total={stats.length} onPageChange={setStatsPage} onPageSizeChange={setStatsPageSize} />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
