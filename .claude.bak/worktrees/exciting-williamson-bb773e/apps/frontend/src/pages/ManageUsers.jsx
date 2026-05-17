import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function ManageUsers() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [educatorStatusFilter, setEducatorStatusFilter] = useState("all");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectUserId, setRejectUserId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => base44.entities.User.list("-created_date"),
    enabled: (user?.role || '').toString().toUpperCase() === "ADMIN",
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      toast.success("Kullanıcı güncellendi");
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
    },
  });

  const handleInvite = async () => {
    if (!inviteEmail) {
      toast.error("E-posta adresi gerekli");
      return;
    }
    try {
      await base44.users.inviteUser(inviteEmail, inviteRole);
      toast.success("Davet gönderildi");
      setShowInvite(false);
      setInviteEmail("");
    } catch (e) {
      toast.error("Davet gönderilemedi");
    }
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast.error("Lütfen red nedeni belirtin");
      return;
    }
    updateUserMutation.mutate({ 
      id: rejectUserId, 
      data: { educator_status: "rejected", rejection_reason: rejectionReason } 
    });
    setShowRejectDialog(false);
    setRejectUserId(null);
    setRejectionReason("");
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = !searchQuery || 
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === "all" || u.user_type === filterType;
    
    const matchesEducatorStatus = educatorStatusFilter === "all" || 
      (u.user_type === "educator" && u.educator_status === educatorStatusFilter);
    
    return matchesSearch && matchesType && matchesEducatorStatus;
  });

  if ((user?.role || '').toString().toUpperCase() !== "ADMIN") {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-slate-900">Erişim Engellendi</h2>
        <p className="text-slate-500 mt-2">Bu sayfaya erişim yetkiniz yok</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Kullanıcılar</h1>
          <p className="text-slate-500 mt-2">Tüm kullanıcıları görüntüle ve yönet</p>
        </div>
        <Button onClick={() => setShowInvite(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <UserPlus className="w-4 h-4 mr-2" />
          Kullanıcı Davet Et
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="İsim veya e-posta ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="candidate">Adaylar</SelectItem>
            <SelectItem value="educator">Eğiticiler</SelectItem>
          </SelectContent>
        </Select>
        <Select value={educatorStatusFilter} onValueChange={setEducatorStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            <SelectItem value="pending">Onay Bekliyor</SelectItem>
            <SelectItem value="approved">Onaylandı</SelectItem>
            <SelectItem value="rejected">Reddedildi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Kullanıcı bulunamadı</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kullanıcı</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Kayıt Tarihi</TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                            <span className="font-semibold text-slate-600">
                              {u.full_name?.[0]?.toUpperCase() || "?"}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{u.full_name}</p>
                            <p className="text-sm text-slate-500">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={u.user_type || "candidate"} 
                          onValueChange={(v) => updateUserMutation.mutate({ id: u.id, data: { user_type: v } })}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="candidate">Aday</SelectItem>
                            <SelectItem value="educator">Eğitici</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          u.role === "ADMIN" 
                            ? "bg-violet-100 text-violet-700"
                            : "bg-slate-100 text-slate-700"
                        }>
                          {u.role === "ADMIN" ? "Admin" : "Kullanıcı"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {u.user_type === "educator" ? (
                          <Badge className={
                            u.educator_status === "approved" 
                              ? "bg-emerald-100 text-emerald-700"
                              : u.educator_status === "rejected"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-700"
                          }>
                            {u.educator_status === "approved" 
                              ? "Onaylandı" 
                              : u.educator_status === "rejected"
                              ? "Reddedildi"
                              : "Onay Bekliyor"}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {u.created_date && format(new Date(u.created_date), "d MMM yyyy", { locale: tr })}
                      </TableCell>
                      <TableCell>
                        {u.user_type === "educator" && (
                          <div className="flex gap-2">
                            {u.educator_status !== "approved" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-emerald-600 hover:text-emerald-700"
                                onClick={() => updateUserMutation.mutate({ 
                                  id: u.id, 
                                  data: { educator_status: "approved" } 
                                })}
                              >
                                Onayla
                              </Button>
                            )}
                            {u.educator_status !== "rejected" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-rose-600 hover:text-rose-700"
                                onClick={() => {
                                  setRejectUserId(u.id);
                                  setShowRejectDialog(true);
                                }}
                              >
                                Reddet
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kullanıcı Davet Et</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>E-posta Adresi</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="ornek@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Kullanıcı</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={() => setShowInvite(false)}>İptal</Button>
              <Button onClick={handleInvite} className="bg-indigo-600 hover:bg-indigo-700">
                Davet Gönder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Başvuruyu Reddet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Red Nedeni *</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Başvurunun red edilme nedenini açıklayın..."
                rows={4}
              />
              <p className="text-sm text-slate-500">Bu açıklama eğitici tarafından görülebilecek</p>
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={() => {
                setShowRejectDialog(false);
                setRejectUserId(null);
                setRejectionReason("");
              }}>İptal</Button>
              <Button 
                onClick={handleReject} 
                className="bg-rose-600 hover:bg-rose-700"
              >
                Reddet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}