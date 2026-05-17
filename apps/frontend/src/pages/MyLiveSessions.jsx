import { useNavigate } from "react-router-dom";
import { liveSessions as liveApi } from "@/api/dalClient";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Zap, Plus, Users, Clock, CheckCircle2,
  FileEdit, ChevronRight, Radio,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

// ─── Durum konfigürasyonu ────────────────────────────────────────────────────
const STATUS_CONFIG = {
  DRAFT:  { label: "Taslak",   color: "bg-slate-100 text-slate-600",   icon: FileEdit   },
  ACTIVE: { label: "Aktif",    color: "bg-emerald-100 text-emerald-700", icon: Radio     },
  ENDED:  { label: "Tamamlandı", color: "bg-blue-100 text-blue-700",   icon: CheckCircle2 },
};

function safeDate(iso) {
  if (!iso) return null;
  try { return format(new Date(iso), "d MMM yyyy HH:mm", { locale: tr }); }
  catch { return null; }
}

// ─── Oturum kartı ───────────────────────────────────────────────────────────
function SessionCard({ session, onOpen }) {
  const cfg      = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.DRAFT;
  const StatusIcon = cfg.icon;
  const qCount   = session.questions?.length ?? session._count?.questions ?? 0;
  const pCount   = session.participants?.length ?? session._count?.participants ?? 0;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border-slate-200"
      onClick={onOpen}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Durum ikonu */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              session.status === "ACTIVE" ? "bg-emerald-100" :
              session.status === "ENDED"  ? "bg-blue-100"    : "bg-slate-100"
            }`}>
              <StatusIcon className={`w-5 h-5 ${
                session.status === "ACTIVE" ? "text-emerald-600" :
                session.status === "ENDED"  ? "text-blue-600"    : "text-slate-500"
              }`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-semibold text-slate-900 truncate">{session.title}</h3>
                <Badge className={cfg.color}>{cfg.label}</Badge>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {qCount} soru
                </span>
                {pCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {pCount} katılımcı
                  </span>
                )}
                {session.tier?.label && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {session.tier.label}
                  </span>
                )}
                {session.createdAt && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {safeDate(session.createdAt)}
                  </span>
                )}
              </div>

              {/* Katılım kodu */}
              {session.joinCode && (
                <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1">
                  <span className="text-xs text-amber-600 font-medium">Kod:</span>
                  <span className="text-sm font-mono font-bold text-amber-800 tracking-widest">
                    {session.joinCode}
                  </span>
                </div>
              )}
            </div>
          </div>

          <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 mt-1" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Ana sayfa ───────────────────────────────────────────────────────────────
export default function MyLiveSessions() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["myLiveSessions"],
    queryFn: () => liveApi.listMy(),
    enabled: !!user,
  });

  const draft  = sessions.filter((s) => s.status === "DRAFT");
  const active = sessions.filter((s) => s.status === "ACTIVE");
  const ended  = sessions.filter((s) => s.status === "ENDED");

  const goToHost   = (id) => navigate(createPageUrl("LiveSessionHost") + "?id=" + id);
  const goToCreate = () => navigate(createPageUrl("LiveSessionCreate"));

  // ── Yükleniyor ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-3 pt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto">
      {/* Başlık */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-500" />
            Canlı Testlerim
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Oluşturduğunuz canlı test oturumlarını yönetin.
          </p>
        </div>
        <Button
          onClick={goToCreate}
          className="bg-amber-500 hover:bg-amber-600 gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Yeni Canlı Test
        </Button>
      </div>

      {/* Boş durum */}
      {sessions.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-10 h-10 text-amber-400" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Henüz canlı test oluşturmadınız
          </h2>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            Canlı bir oturum başlatın, katılımcılar QR kod veya kod ile katılsın.
          </p>
          <Button onClick={goToCreate} className="bg-amber-500 hover:bg-amber-600 gap-2">
            <Plus className="w-4 h-4" />
            İlk Canlı Testimi Oluştur
          </Button>
        </div>
      )}

      {/* Aktif oturumlar */}
      {active.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">
              Aktif ({active.length})
            </h2>
          </div>
          <div className="space-y-3">
            {active.map((s) => (
              <SessionCard key={s.id} session={s} onOpen={() => goToHost(s.id)} />
            ))}
          </div>
        </section>
      )}

      {/* Taslak oturumlar */}
      {draft.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Taslak ({draft.length})
          </h2>
          <div className="space-y-3">
            {draft.map((s) => (
              <SessionCard key={s.id} session={s} onOpen={() => goToHost(s.id)} />
            ))}
          </div>
        </section>
      )}

      {/* Tamamlanan oturumlar */}
      {ended.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Tamamlanan ({ended.length})
          </h2>
          <div className="space-y-3">
            {ended.map((s) => (
              <SessionCard key={s.id} session={s} onOpen={() => goToHost(s.id)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
