import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import Sidebar from "@/components/layout/Sidebar";
import { Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          const userData = await base44.auth.me();
          setUser(userData);
        }
      } catch (e) {
        console.log("User not logged in");
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  // Home is always public without sidebar
  if (currentPageName === "Home") {
    return (
      <div className="min-h-screen bg-white">
        {children}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Public pages that can be viewed without login but show sidebar if logged in
  const publicPages = ["Explore", "TestDetail", "About", "Contact", "Privacy", "Partnership", "Support", "Educators", "ExamTypes", "EducatorProfile"];
  const isPublicPage = publicPages.includes(currentPageName);

  // If public page and no user, show without sidebar
  if (isPublicPage && !user) {
    return (
      <div className="min-h-screen bg-white">
        {children}
      </div>
    );
  }

  // If not public and no user, show login prompt
  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Giriş Yapmanız Gerekiyor</h1>
          <Button onClick={() => base44.auth.redirectToLogin()} className="bg-indigo-600 hover:bg-indigo-700">
            Giriş Yap
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </Button>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-40 transform transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <Sidebar user={user} currentPage={currentPageName} />
      </div>

      {/* Main content */}
      <main className="flex-1 lg:ml-0 min-h-screen">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}