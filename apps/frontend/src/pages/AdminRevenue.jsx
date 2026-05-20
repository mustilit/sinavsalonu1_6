import { lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Banknote, Megaphone } from "lucide-react";

// Var olan iki sayfa tab içeriği olarak kullanılır — tekrar kod yazılmaz.
const AdminCommissionReport = lazy(() => import("./AdminCommissionReport"));
const AdminAdReport = lazy(() => import("./AdminAdReport"));

const TABS = [
  { value: "komisyon", label: "Komisyon Raporu", icon: Banknote,  Component: AdminCommissionReport },
  { value: "reklam",   label: "Reklam Raporu",   icon: Megaphone, Component: AdminAdReport },
];

function TabFallback() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

/**
 * AdminRevenue — "Gelirler" admin sayfası.
 * Komisyon Raporu + Reklam Raporu tek sayfada iki sekme olarak görüntülenir.
 * URL deep-link: `?tab=komisyon` (varsayılan) veya `?tab=reklam`.
 */
export default function AdminRevenue() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const active = TABS.find((t) => t.value === requested)?.value ?? TABS[0].value;

  const onTabChange = (v) => {
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      if (v === TABS[0].value) p.delete("tab");
      else p.set("tab", v);
      return p;
    });
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Gelirler</h1>
        <p className="text-slate-500 mt-2">Komisyon ve reklam gelir raporları</p>
      </div>

      <Tabs value={active} onValueChange={onTabChange} className="space-y-4">
        <TabsList>
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value}>
              <Icon className="w-4 h-4 mr-1.5" aria-hidden="true" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map(({ value, Component }) => (
          <TabsContent key={value} value={value}>
            <Suspense fallback={<TabFallback />}>
              <Component />
            </Suspense>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
