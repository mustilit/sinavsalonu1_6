import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit2, Trash2, Award } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function ManageExamTypes() {
  const { user } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "", is_active: true });
  const queryClient = useQueryClient();

  const { data: examTypes = [], isLoading } = useQuery({
    queryKey: ["examTypes"],
    queryFn: () => base44.entities.ExamType.list("-created_date"),
    enabled: (user?.role || '').toString().toUpperCase() === "ADMIN",
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ExamType.create(data),
    onSuccess: () => {
      toast.success("Sınav türü oluşturuldu");
      queryClient.invalidateQueries({ queryKey: ["examTypes"] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ExamType.update(id, data),
    onSuccess: () => {
      toast.success("Sınav türü güncellendi");
      queryClient.invalidateQueries({ queryKey: ["examTypes"] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ExamType.delete(id),
    onSuccess: () => {
      toast.success("Sınav türü silindi");
      queryClient.invalidateQueries({ queryKey: ["examTypes"] });
      setDeleteId(null);
    },
  });

  const openDialog = (exam = null) => {
    if (exam) {
      setEditingExam(exam);
      setFormData({ name: exam.name, description: exam.description || "", is_active: exam.is_active });
    } else {
      setEditingExam(null);
      setFormData({ name: "", description: "", is_active: true });
    }
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingExam(null);
    setFormData({ name: "", description: "", is_active: true });
  };

  const handleSubmit = () => {
    if (!formData.name) {
      toast.error("Sınav türü adı gerekli");
      return;
    }
    if (editingExam) {
      updateMutation.mutate({ id: editingExam.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

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
          <h1 className="text-3xl font-bold text-slate-900">Sınav Türleri</h1>
          <p className="text-slate-500 mt-2">Platformdaki sınav türlerini yönet</p>
        </div>
        <Button onClick={() => openDialog()} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          Yeni Sınav Türü
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : examTypes.length === 0 ? (
            <div className="text-center py-12">
              <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Henüz sınav türü yok</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {examTypes.map((exam) => (
                <div key={exam.id} className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <Award className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{exam.name}</h3>
                      <p className="text-sm text-slate-500 line-clamp-1">
                        {exam.description || "Açıklama yok"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm px-3 py-1 rounded-full ${
                      exam.is_active 
                        ? "bg-emerald-100 text-emerald-700" 
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {exam.is_active ? "Aktif" : "Pasif"}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => openDialog(exam)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-rose-600"
                      onClick={() => setDeleteId(exam.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingExam ? "Sınav Türünü Düzenle" : "Yeni Sınav Türü"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Sınav Türü Adı *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Örn: KPSS"
              />
            </div>
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Sınav türü hakkında kısa açıklama"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Aktif</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
              />
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={closeDialog}>İptal</Button>
              <Button 
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {createMutation.isPending || updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sınav türünü silmek istediğinize emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => deleteMutation.mutate(deleteId)}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}