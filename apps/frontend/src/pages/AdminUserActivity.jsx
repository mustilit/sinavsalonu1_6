import { useState } from "react";
import { adminUsers, adminAudit } from "@/api/dalClient";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, History, User as UserIcon, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

/**
 * AdminUserActivity — admin tarafından kullanıcı işlem geçmişi görüntüleme.
 *
 * Akış:
 *   1) Admin email/kullanıcı adı + (opsiyonel) tarih aralığı girer.
 *   2) Önce GET /admin/users?q=... ile kullanıcı bulunur.
 *   3) Bulunan user.id ile GET /admin/audit?actorId=...&from=...&to=... çağrılır.
 *   4) AuditLog kayıtları tabloda listelenir (action, entityType, entityId, timestamp, metadata).
 *
 * Rol farkı yok: aday/eğitici/admin/worker hepsinin actorId'si audit log'da aranır.
 */

const ROLE_LABEL_TR = {
  CANDIDATE: "Aday",
  EDUCATOR: "Eğitici",
  ADMIN: "Yönetici",
  WORKER: "Çalışan",
};

function safeFmt(ts) {
  if (!ts) return "—";
  try {
    return format(new Date(ts), "d MMM yyyy HH:mm:ss", { locale: tr });
  } catch {
    return String(ts);
  }
}

function MetadataPreview({ metadata }) {
  if (metadata == null) return <span className="text-slate-400">—</span>;
  let text;
  try {
    text = typeof metadata === "string" ? metadata : JSON.stringify(metadata);
  } catch {
    text = "[parse error]";
  }
  if (text.length > 120) text = text.slice(0, 120) + "…";
  return (
    <code className="text-xs text-slate-600 break-all">{text}</code>
  );
}

export default function AdminUserActivity() {
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [foundUser, setFoundUser] = useState(null);
  const [logs, setLogs] = useState(null);

  const searchMut = useMutation({
    mutationFn: async () => {
      const q = query.trim();
      if (!q) throw new Error("Kullanıcı adı veya email gerekli");

      // 1) User lookup
      const users = await adminUsers.search({ q, limit: 5 });
      if (!Array.isArray(users) || users.length === 0) {
        throw new Error("Kullanıcı bulunamadı");
      }
      const user = users[0]; // ilk eşleşmeyi al

      // 2) Audit logs
      const fromIso = from ? new Date(from).toISOString() : undefined;
      // 'to' alanında günü gün sonuna kadar dahil et
      let toIso;
      if (to) {
        const d = new Date(to);
        d.setHours(23, 59, 59, 999);
        toIso = d.toISOString();
      }
      const data = await adminAudit.list({
        actorId: user.id,
        from: fromIso,
        to: toIso,
        page: 1,
        limit: 200,
      });
      const items = Array.isArray(data) ? data : (data?.items ?? data?.logs ?? []);
      return { user, items, total: data?.total ?? items.length };
    },
    onSuccess: (data) => {
      setFoundUser(data.user);
      setLogs(data.items);
      if (data.items.length === 0) {
        toast.info("Bu kullanıcı için kayıt bulunamadı");
      } else {
        toast.success(`${data.items.length} kayıt bulundu`);
      }
    },
    onError: (e) => {
      setFoundUser(null);
      setLogs(null);
      toast.error(e?.message ?? "Arama başarısız");
    },
  });

  const handleSubmit = (e) => {
    e?.preventDefault();
    searchMut.mutate();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
          <History className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kullanıcı İşlem Geçmişi</h1>
          <p className="text-sm text-slate-500">
            Aday veya eğitici hesabının audit log kayıtlarını görüntüle
          </p>
        </div>
      </div>

      {/* Search form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-3">
            <Label className="text-xs mb-1 block">Kullanıcı adı veya email</Label>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ör. aday@demo.com veya demo_egitici"
              className="h-9"
              autoFocus
            />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Başlangıç tarihi (opsiyonel)</Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Bitiş tarihi (opsiyonel)</Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="flex items-end">
            <Button
              type="submit"
              className="w-full h-9 bg-indigo-600 hover:bg-indigo-700"
              disabled={searchMut.isPending || !query.trim()}
            >
              <Search className="w-4 h-4 mr-1.5" />
              {searchMut.isPending ? "Aranıyor…" : "Geçmişi Getir"}
            </Button>
          </div>
        </div>
      </form>

      {/* User info */}
      {foundUser && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <UserIcon className="w-5 h-5 text-slate-500" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-slate-900">
                  {foundUser.name || foundUser.username || foundUser.email}
                </p>
                <Badge variant="outline" className="text-xs">
                  {ROLE_LABEL_TR[foundUser.role] ?? foundUser.role ?? "—"}
                </Badge>
              </div>
              <p className="text-sm text-slate-500">{foundUser.email}</p>
              <p className="text-xs text-slate-400 mt-1">ID: <code>{foundUser.id}</code></p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {logs !== null && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 text-sm">
              İşlem Kayıtları
              <span className="ml-2 text-xs font-normal text-slate-500">({logs.length})</span>
            </h2>
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>Bu kullanıcı için seçilen aralıkta kayıt bulunamadı.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left">Tarih</th>
                    <th className="px-3 py-2 text-left">Eylem</th>
                    <th className="px-3 py-2 text-left">Varlık Tipi</th>
                    <th className="px-3 py-2 text-left">Varlık ID</th>
                    <th className="px-3 py-2 text-left">Detay</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, idx) => (
                    <tr
                      key={log.id ?? idx}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                        {safeFmt(log.createdAt ?? log.timestamp ?? log.created_at)}
                      </td>
                      <td className="px-3 py-2">
                        <code className="text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                          {log.action ?? "—"}
                        </code>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{log.entityType ?? "—"}</td>
                      <td className="px-3 py-2">
                        <code className="text-xs text-slate-500">
                          {log.entityId ? String(log.entityId).slice(0, 16) + (String(log.entityId).length > 16 ? "…" : "") : "—"}
                        </code>
                      </td>
                      <td className="px-3 py-2 max-w-[300px]">
                        <MetadataPreview metadata={log.metadata} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
