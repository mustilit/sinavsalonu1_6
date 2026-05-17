import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ShoppingBag, TrendingUp, Users, DollarSign, Search, Download, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function MySales() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {}
    };
    loadUser();
  }, []);

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["mySales", user?.email],
    queryFn: () => base44.entities.Purchase.filter({ educator_email: user.email }, "-created_date"),
    enabled: !!user,
  });

  // Filter sales
  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         sale.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         sale.test_package_title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || sale.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      matchesDate = new Date(sale.created_date) >= today;
    } else if (dateFilter === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      matchesDate = new Date(sale.created_date) >= weekAgo;
    } else if (dateFilter === "month") {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      matchesDate = new Date(sale.created_date) >= monthAgo;
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalRevenue = sales.reduce((sum, s) => sum + (s.price_paid || 0), 0);
  const uniqueBuyers = new Set(sales.map(s => s.user_email)).size;

  // This month's stats
  const thisMonth = new Date();
  thisMonth.setDate(1);
  const thisMonthSales = sales.filter(s => new Date(s.created_date) >= thisMonth);
  const thisMonthRevenue = thisMonthSales.reduce((sum, s) => sum + (s.price_paid || 0), 0);

  const hasActiveFilters = searchQuery || statusFilter !== "all" || dateFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDateFilter("all");
  };

  const exportToExcel = () => {
    const csvContent = [
      ["Alıcı", "Email", "Test", "Tutar", "Durum", "Tarih"],
      ...filteredSales.map(sale => [
        sale.user_name || "Kullanıcı",
        sale.user_email,
        sale.test_package_title,
        sale.price_paid,
        sale.status === "completed" ? "Tamamlandı" : sale.status === "refunded" ? "İade" : "Beklemede",
        sale.created_date && format(new Date(sale.created_date), "d MMM yyyy HH:mm", { locale: tr })
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `satislarim-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success("Excel dosyası indirildi");
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Satışlarım</h1>
        <p className="text-slate-500 mt-2">Test satış geçmişin ve istatistiklerin</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Toplam Satış"
          value={sales.length}
          icon={ShoppingBag}
          bgColor="bg-indigo-500"
        />
        <StatCard
          title="Toplam Gelir"
          value={`₺${totalRevenue.toLocaleString()}`}
          icon={TrendingUp}
          bgColor="bg-emerald-500"
        />
        <StatCard
          title="Bu Ay Gelir"
          value={`₺${thisMonthRevenue.toLocaleString()}`}
          icon={DollarSign}
          bgColor="bg-violet-500"
        />
        <StatCard
          title="Benzersiz Alıcı"
          value={uniqueBuyers}
          icon={Users}
          bgColor="bg-amber-500"
        />
      </div>

      {/* Filters */}
      {!isLoading && sales.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Alıcı veya test ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                <SelectItem value="completed">Tamamlandı</SelectItem>
                <SelectItem value="pending">Beklemede</SelectItem>
                <SelectItem value="refunded">İade</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full lg:w-40">
                <SelectValue placeholder="Tarih" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Zamanlar</SelectItem>
                <SelectItem value="today">Bugün</SelectItem>
                <SelectItem value="week">Son 7 Gün</SelectItem>
                <SelectItem value="month">Son 30 Gün</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={exportToExcel}
              className="w-full lg:w-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              Excel İndir
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="w-full lg:w-auto">
                <X className="w-4 h-4 mr-2" />
                Temizle
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Satış Geçmişi</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Henüz satış yok</p>
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-12">
              <Filter className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 mb-4">Sonuç bulunamadı</p>
              <Button variant="outline" onClick={clearFilters}>
                <X className="w-4 h-4 mr-2" />
                Filtreleri Temizle
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alıcı</TableHead>
                    <TableHead>Test</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Tarih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{sale.user_name || "Kullanıcı"}</p>
                          <p className="text-sm text-slate-500">{sale.user_email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {sale.test_package_title}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600">
                        ₺{sale.price_paid}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          sale.status === "completed" 
                            ? "bg-emerald-100 text-emerald-700"
                            : sale.status === "refunded"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-700"
                        }>
                          {sale.status === "completed" ? "Tamamlandı" 
                            : sale.status === "refunded" ? "İade" : "Beklemede"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {sale.created_date && format(new Date(sale.created_date), "d MMM yyyy HH:mm", { locale: tr })}
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