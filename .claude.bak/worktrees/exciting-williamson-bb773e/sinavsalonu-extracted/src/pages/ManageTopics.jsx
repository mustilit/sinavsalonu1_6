import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2, BookOpen } from "lucide-react";
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

export default function ManageTopics() {
  const [user, setUser] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [formData, setFormData] = useState({ name: "", exam_type_id: "" });
  const [filterExamType, setFilterExamType] = useState("all");
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

  const { data: topics = [], isLoading } = useQuery({
    queryKey: ["topics"],
    queryFn: () => base44.entities.Topic.list("-created_date"),
    enabled: user?.role === "admin",
  });

  const { data: examTypes = [] } = useQuery({
    queryKey: ["examTypes"],
    queryFn: () => base44.entities.ExamType.filter({ is_active: true }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      const examType = examTypes.find(e => e.id === data.exam_type_id);
      return base44.entities.Topic.create({
        ...data,
        exam_type_name: examType?.name || ""
      });
    },
    onSuccess: () => {
      toast.success("Konu oluşturuldu");
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => {
      const examType = examTypes.find(e => e.id === data.exam_type_id);
      return base44.entities.Topic.update(id, {
        ...data,
        exam_type_name: examType?.name || ""
      });
    },
    onSuccess: () => {
      toast.success("Konu güncellendi");
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Topic.delete(id),
    onSuccess: () => {
      toast.success("Konu silindi");
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      setDeleteId(null);
    },
  });

  const openDialog = (topic = null) => {
    if (topic) {
      setEditingTopic(topic);
      setFormData({ name: topic.name, exam_type_id: topic.exam_type_id });
    } else {
      setEditingTopic(null);
      setFormData({ name: "", exam_type_id: "" });
    }
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingTopic(null);
    setFormData({ name: "", exam_type_id: "" });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.exam_type_id) {
      toast.error("Lütfen tüm alanları doldurun");
      return;
    }
    if (editingTopic) {
      updateMutation.mutate({ id: editingTopic.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredTopics = filterExamType === "all" 
    ? topics 
    : topics.filter(t => t.exam_type_id === filterExamType);

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-slate-900">Erişim Engellendi</h2>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Soru Konuları</h1>
          <p className="text-slate-500 mt-2">Sınav türlerine bağlı konuları yönet</p>
        </div>
        <Button onClick={() => openDialog()} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          Yeni Konu
        </Button>
      </div>

      <div className="mb-6">
        <Select value={filterExamType} onValueChange={setFilterExamType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Sınav Türü Filtrele" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Sınav Türleri</SelectItem>
            {examTypes.map((exam) => (
              <SelectItem key={exam.id} value={exam.id}>{exam.name}</SelectItem>
            ))}
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
          ) : filteredTopics.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Konu bulunamadı</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTopics.map((topic) => (
                <div key={topic.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-slate-900">{topic.name}</p>
                    <p className="text-sm text-slate-500">{topic.exam_type_name}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openDialog(topic)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-rose-600"
                      onClick={() => setDeleteId(topic.id)}
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

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTopic ? "Konuyu Düzenle" : "Yeni Konu"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Sınav Türü *</Label>
              <Select value={formData.exam_type_id} onValueChange={(v) => setFormData({ ...formData, exam_type_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {examTypes.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>{exam.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Konu Adı *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Örn: Türkçe - Paragraf"
              />
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={closeDialog}>İptal</Button>
              <Button 
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Kaydet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konuyu silmek istediğinize emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>Bu işlem geri alınamaz.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={() => deleteMutation.mutate(deleteId)}>
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}