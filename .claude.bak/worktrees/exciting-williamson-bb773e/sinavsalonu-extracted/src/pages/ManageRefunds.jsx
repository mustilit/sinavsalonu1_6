import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Filter } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export default function ManageRefunds() {
  const [user, setUser] = useState(null);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [filterTest, setFilterTest] = useState("all");
  const [filterEducator, setFilterEducator] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [pendingPage, setPendingPage] = useState(1);
  const [resolvedPage, setResolvedPage] = useState(1);
  const itemsPerPage = 50;
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {}
    };
    loadUser();
  }, []);

  const { data: refunds = [], isLoading } = useQuery({
    queryKey: ["refunds"],
    queryFn: () => base44.entities.RefundRequest.list("-created_date"),
    enabled: user?.role === "admin",
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RefundRequest.update(id, data),
    onSuccess: () => {
      toast.success("İade talebi güncellendi");
      queryClient.invalidateQueries({ queryKey: ["refunds"] });
      setSelectedRefund(null);
      setAdminNotes("");
    },
  });

  const handleDecision = (status) => {
    updateMutation.mutate({
      id: selectedRefund.id,
      data: {
        status,
        admin_notes: adminNotes,
        resolved_date: new Date().toISOString()
      }
    });
  };

  // Apply filters
  const filteredRefunds = refunds.filter(r => {
    const matchesTest = filterTest === "all" || r.test_package_id === filterTest;
    const matchesEducator = filterEducator === "all" || r.educator_email === filterEducator;
    const matchesStatus = filterStatus === "all" || r.status === filterStatus;
    return matchesTest && matchesEducator && matchesStatus;
  });

  const allPendingRefunds = filteredRefunds.filter(r => r.status === "pending");
  const allResolvedRefunds = filteredRefunds.filter(r => r.status !== "pending");

  // Pagination
  const totalPendingPages = Math.ceil(allPendingRefunds.length / itemsPerPage);
  const totalResolvedPages = Math.ceil(allResolvedRefunds.length / itemsPerPage);
  
  const pendingRefunds = allPendingRefunds.slice(
    (pendingPage - 1) * itemsPerPage,
    pendingPage * itemsPerPage
  );
  const resolvedRefunds = allResolvedRefunds.slice(
    (resolvedPage - 1) * itemsPerPage,
    resolvedPage * itemsPerPage
  );

  // Get unique tests and educators for filters
  const uniqueTests = [...new Map(refunds.map(r => [r.test_package_id, { id: r.test_package_id, title: r.test_package_title }])).values()];
  const uniqueEducators = [...new Map(refunds.map(r => [r.educator_email, { email: r.educator_email }])).values()];

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-slate-900">Erişim Engellendi</h2>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">İade Talepleri</h1>
        <p className="text-slate-500 mt-2">Kullanıcı iade taleplerini incele ve sonuçlandır</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-2 text-slate-600">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filtrele:</span>
        </div>
        <Select value={filterTest} onValueChange={setFilterTest}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Test" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Testler</SelectItem>
            {uniqueTests.map((test) => (
              <SelectItem key={test.id} value={test.id}>{test.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterEducator} onValueChange={setFilterEducator}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Eğitici" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Eğiticiler</SelectItem>
            {uniqueEducators.map((educator) => (
              <SelectItem key={educator.email} value={educator.email}>{educator.email}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            <SelectItem value="pending">Bekleyen</SelectItem>
            <SelectItem value="approved">Onaylanan</SelectItem>
            <SelectItem value="rejected">Reddedilen</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending">Bekleyen ({pendingRefunds.length})</TabsTrigger>
          <TabsTrigger value="resolved">Sonuçlanan ({resolvedRefunds.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : pendingRefunds.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                <p className="text-slate-500">Bekleyen iade talebi yok</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingRefunds.map((refund) => (
                <Card key={refund.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-amber-100 rounded-xl">
                          <RefreshCw className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{refund.test_package_title}</p>
                          <p className="text-sm text-slate-500 mt-1">{refund.reason}</p>
                          <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                            <span>{refund.user_name}</span>
                            <span>₺{refund.amount}</span>
                            {refund.report_count > 0 && (
                              <Badge className="bg-rose-100 text-rose-700">
                                {refund.report_count} hata bildirimi
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button onClick={() => setSelectedRefund(refund)}>
                        İncele
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {totalPendingPages > 1 && (
            <Pagination className="mt-6">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setPendingPage(p => Math.max(1, p - 1))}
                    className={pendingPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {[...Array(totalPendingPages)].map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      onClick={() => setPendingPage(i + 1)}
                      isActive={pendingPage === i + 1}
                      className="cursor-pointer"
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setPendingPage(p => Math.min(totalPendingPages, p + 1))}
                    className={pendingPage === totalPendingPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </TabsContent>

        <TabsContent value="resolved">
          {resolvedRefunds.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-slate-500">Sonuçlanan talep yok</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {resolvedRefunds.map((refund) => (
                <Card key={refund.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={refund.status === "approved" 
                        ? "bg-emerald-100 text-emerald-700" 
                        : "bg-rose-100 text-rose-700"
                      }>
                        {refund.status === "approved" ? "Onaylandı" : "Reddedildi"}
                      </Badge>
                    </div>
                    <p className="font-medium text-slate-900">{refund.test_package_title}</p>
                    <p className="text-sm text-slate-500 mt-1">{refund.user_name} - ₺{refund.amount}</p>
                    {refund.admin_notes && (
                      <p className="text-sm text-slate-600 mt-2 p-2 bg-slate-50 rounded">
                        <strong>Not:</strong> {refund.admin_notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {totalResolvedPages > 1 && (
            <Pagination className="mt-6">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setResolvedPage(p => Math.max(1, p - 1))}
                    className={resolvedPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {[...Array(totalResolvedPages)].map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      onClick={() => setResolvedPage(i + 1)}
                      isActive={resolvedPage === i + 1}
                      className="cursor-pointer"
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setResolvedPage(p => Math.min(totalResolvedPages, p + 1))}
                    className={resolvedPage === totalResolvedPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedRefund} onOpenChange={() => setSelectedRefund(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>İade Talebini İncele</DialogTitle>
          </DialogHeader>
          {selectedRefund && (
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                <p><strong>Kullanıcı:</strong> {selectedRefund.user_name}</p>
                <p><strong>Test:</strong> {selectedRefund.test_package_title}</p>
                <p><strong>Tutar:</strong> ₺{selectedRefund.amount}</p>
                <p><strong>Sebep:</strong> {selectedRefund.reason}</p>
                {selectedRefund.report_count > 0 && (
                  <p className="text-rose-600">
                    <strong>Hata Bildirimi:</strong> {selectedRefund.report_count} adet
                  </p>
                )}
              </div>
              
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Yönetici notu (opsiyonel)..."
                rows={3}
              />

              <div className="flex gap-3 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => handleDecision("rejected")}
                  className="text-rose-600"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reddet
                </Button>
                <Button 
                  onClick={() => handleDecision("approved")}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Onayla
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}