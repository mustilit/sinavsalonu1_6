import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import {
  Home,
  Search,
  BookOpen,
  BarChart3,
  Plus,
  Settings,
  Users,
  ShoppingBag,
  GraduationCap,
  LogOut,
  Award,
  User
} from "lucide-react";

export default function Sidebar({ user, currentPage }) {
  const { logout } = useAuth();
  const role = (user?.role || '').toString().toUpperCase();
  const isEducator = role === "EDUCATOR";
  const isApprovedEducator = isEducator && (user?.status === "ACTIVE" || user?.educatorApprovedAt);
  const isAdmin = role === "ADMIN";

  const candidateLinks = [
    { name: "Ana Sayfa", page: "Home", icon: Home },
    { name: "Testleri Keşfet", page: "Explore", icon: Search },
    { name: "Satın Alınan Testler", page: "MyTests", icon: BookOpen },
    { name: "Performans Raporları", page: "MyResults", icon: BarChart3 },
    { name: "Profil Ayarları", page: "ProfileSettings", icon: User },
  ];

  const educatorLinks = isApprovedEducator ? [
    { name: "Dashboard", page: "EducatorDashboard", icon: Home },
    { name: "Test Paketlerim", page: "MyTestPackages", icon: BookOpen },
    { name: "Yeni Test Oluştur", page: "CreateTest", icon: Plus },
    { name: "Satışlarım", page: "MySales", icon: ShoppingBag },
    { name: "İndirim Kodları", page: "MyDiscountCodes", icon: Award },
    { name: "Hata Bildirimleri", page: "QuestionReports", icon: Settings },
    { name: "Profil Ayarları", page: "EducatorSettings", icon: User },
  ] : [
    { name: "Profil Ayarları", page: "EducatorSettings", icon: User },
  ];

  const adminLinks = [
    { name: "Yönetim Paneli", page: "AdminDashboard", icon: Settings },
    { name: "Sınav Türleri", page: "ManageExamTypes", icon: Award },
    { name: "Soru Konuları", page: "ManageTopics", icon: BookOpen },
    { name: "Kullanıcılar", page: "ManageUsers", icon: Users },
    { name: "Tüm Testler", page: "ManageTests", icon: BookOpen },
    { name: "İade Talepleri", page: "ManageRefunds", icon: ShoppingBag },
  ];

  let links = candidateLinks;
  if (isAdmin) {
    links = [...adminLinks, { divider: true }, ...candidateLinks];
  } else if (isEducator) {
    links = [
      ...educatorLinks,
      ...(isApprovedEducator ? [] : [
        { divider: true },
        { 
          name: "⚠️ Hesap Onayı Bekleniyor", 
          page: "EducatorSettings",
          icon: Settings,
          isPending: true 
        }
      ])
    ];
  }

  const handleLogout = () => logout(true);

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-100">
        <Link to={createPageUrl("Home")} className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900">Sınav Salonu</span>
        </Link>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {links.map((link, idx) => 
            link.divider ? (
              <li key={idx} className="my-4 border-t border-slate-200" />
            ) : (
              <li key={link.page}>
                <Link
                  to={createPageUrl(link.page)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    currentPage === link.page
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <link.icon className="w-5 h-5" />
                  {link.name}
                </Link>
              </li>
            )
          )}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center">
            <span className="text-sm font-semibold text-slate-600">
              {(user?.full_name || user?.username || "?")[0]?.toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{user?.full_name || user?.username}</p>
            <p className="text-xs text-slate-500 truncate">
              {isAdmin ? "Yönetici" : isEducator ? "Eğitici" : "Aday"}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all mt-2"
        >
          <LogOut className="w-5 h-5" />
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}