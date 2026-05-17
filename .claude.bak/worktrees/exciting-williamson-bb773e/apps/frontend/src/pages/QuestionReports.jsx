import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, MessageSquare, Clock, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { tr } from "date-fns/locale";

const reportTypeLabels = {
  wrong_answer: "Yanlış Cevap",
  unclear_question: "Belirsiz Soru",
  missing_option: "Eksik Şık",
  typo: "Yazım Hatası",
  other: "Diğer"
};

const statusLabels = {
  pending: { label: "Beklemede", color: "bg-amber-100 text-amber-700" },
  educator_review: { label: "İncelemede", color: "bg-blue-100 text-blue-700" },
  admin_review: { label: "Yönetici İncelemesi", color: "bg-violet-100 text-violet-700" },
  resolved: { label: "Çözüldü", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Reddedildi", color: "bg-slate-100 text-slate-600" }
};

export default function QuestionReports() {
  const { user } = useAuth();
  const [selectedReport, setSelectedReport] = useState(null);
  const [response, setResponse] = useState("");
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["questionReports", user?.email],
    queryFn: () => base44.entities.QuestionReport.filter({ educator_email: user.email }, "-created_date"),
    enabled: !!user,
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.QuestionReport.update(id, data),
    onSuccess: () => {
      toast.success("Yanıt gönderildi");
      queryClient.invalidateQueries({ queryKey: ["questionReports"] });
      setSelectedReport(null);
      setResponse("");
    },
  });

  const handleRespond = (status) => {
    if (!response.trim()) {
      toast.error("Lütfen bir yanıt yazın");
      return;
    }
    respondMutation.mutate({
      id: selectedReport?.id,
      data: {
        educator_response: response,
        educator_response_date: new Date().toISOString(),
        status
      }
    });
  };

  const pendingReports = reports.filter(r => r.status === "pending" || r.status === "educator_review");
  const resolvedReports = reports.filter(r => r.status === "resolved" || r.status === "rejected");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Hata Bildirimleri</h1>
        <p className="text-slate-500 mt-2">Adaylardan gelen soru itirazlarını yönet</p>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending">Bekleyen ({pendingReports.length})</TabsTrigger>
          <TabsTrigger value="resolved">Sonuçlanan ({resolvedReports.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : pendingReports.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                <p className="text-slate-500">Bekleyen bildirim yok</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingReports.map((report) => {
                const daysLeft = report.deadline_date 
                  ? differenceInDays(new Date(report.deadline_date), new Date())
                  : 10;
                
                return (
                  <Card key={report.id} className={daysLeft <= 2 ? "border-rose-200" : ""}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl ${daysLeft <= 2 ? "bg-rose-100" : "bg-amber-100"}`}>
                            <AlertTriangle className={`w-5 h-5 ${daysLeft <= 2 ? "text-rose-600" : "text-amber-600"}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-slate-100 text-slate-700">
                                {reportTypeLabels[report.report_type]}
                              </Badge>
                              <Badge className={statusLabels[report.status]?.color}>
                                {statusLabels[report.status]?.label}
                              </Badge>
                            </div>
                            <p className="font-medium text-slate-900">{report.test_package_title}</p>
                            <p className="text-sm text-slate-500 mt-1">{report.description}</p>
                            <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                              <span>Bildiren: {report.reporter_name}</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {daysLeft > 0 ? `${daysLeft} gün kaldı` : "Süre doldu"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button onClick={() => setSelectedReport(report)}>
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Yanıtla
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="resolved">
          {resolvedReports.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-slate-500">Sonuçlanan bildirim yok</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {resolvedReports.map((report) => (
                <Card key={report.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={statusLabels[report.status]?.color}>
                        {statusLabels[report.status]?.label}
                      </Badge>
                      <Badge className="bg-slate-100 text-slate-700">
                        {reportTypeLabels[report.report_type]}
                      </Badge>
                    </div>
                    <p className="font-medium text-slate-900">{report.test_package_title}</p>
                    <p className="text-sm text-slate-500 mt-1">{report.description}</p>
                    {report.educator_response && (
                      <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-600"><strong>Yanıtınız:</strong> {report.educator_response}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bildirime Yanıt Ver</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500 mb-1">Bildirim:</p>
                <p className="text-slate-900">{selectedReport.description}</p>
              </div>
              <div className="space-y-2">
                <Textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Yanıtınızı yazın..."
                  rows={4}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => handleRespond("rejected")}>
                  Reddet
                </Button>
                <Button onClick={() => handleRespond("resolved")} className="bg-emerald-600 hover:bg-emerald-700">
                  Kabul Et ve Çöz
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}