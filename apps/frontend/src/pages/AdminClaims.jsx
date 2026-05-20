import { lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag, AlertTriangle } from "lucide-react";

// Var olan iki sayfa tab içeriği olarak kullanılır — tekrar kod yazılmaz.
const ManageRefunds = lazy(() => import("./ManageRefunds"));
const AdminObjections = lazy(() => import("./AdminObjections"));

const TABS = [
  { value: "iade",       label: "İade Talepleri",    icon: ShoppingBag,    Component: ManageRefunds },
  { value: "bildirim",   label: "Hata Bildirimleri", icon: AlertTriangle,  Component: AdminObjections },
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
 * AdminClaims — "Talepler" admin sayfası.
 * İade Talepleri + Hata Bildirimleri tek sayfada iki sekme olarak görüntülenir.
 * URL deep-link: `?tab=iade` (varsayılan) veya `?tab=bildirim`.
 */
export default function AdminClaims() {
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
        <h1 className="text-3xl font-bold text-slate-900">Talepler</h1>
        <p className="text-slate-500 mt-2">İade talepleri ve hata bildirimlerini yönet</p>
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
