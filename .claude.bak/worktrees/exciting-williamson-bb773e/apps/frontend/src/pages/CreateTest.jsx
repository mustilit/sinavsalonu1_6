import { useState } from "react";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { buildPageUrl, useAppNavigate } from "@/lib/navigation";

export default function CreateTest() {
  const { user } = useAuth();
  const navigate = useAppNavigate();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    exam_type_id: "",
    topic_id: "",
    price: 0,
    duration_minutes: 60,
    is_timed: false,
  });

  const { data: examTypes = [] } = useQuery({
    queryKey: ["examTypes"],
    queryFn: () => base44.entities.ExamType.filter({ is_active: true }),
  });

  const { data: topics = [] } = useQuery({
    queryKey: ["topics", formData.exam_type_id],
    queryFn: async () => {
      const list = await base44.entities.Topic.list();
      return formData.exam_type_id
        ? list.filter((t) => t.exam_type_id === formData.exam_type_id)
        : list;
    },
    enabled: !!formData.exam_type_id || true,
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.TestPackage.create({
        title: data.title,
        exam_type_id: data.exam_type_id || null,
        topic_id: data.topic_id || null,
        price: data.price,
        is_timed: data.is_timed,
        duration: data.duration_minutes,
        questions: [],
      });
    },
    onSuccess: (newTest) => {
      toast.success("Test oluşturuldu!");
      navigate(buildPageUrl("EditTest", { id: newTest.id }), { replace: true });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Test oluşturulurken hata oluştu");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title) {
      toast.error("Lütfen test başlığı girin");
      return;
    }
    createMutation.mutate(formData);
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-slate-600 mb-4">Test oluşturmak için giriş yapın</p>
        <Link to={createPageUrl("Login")}>
          <Button className="bg-indigo-600 hover:bg-indigo-700">Giriş Yap</Button>
        </Link>
      </div>
    );
  }

  if (user.role === "EDUCATOR" && user?.status === "PENDING_EDUCATOR_APPROVAL") {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="w-20 h-20 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-4">
          <Save className="w-10 h-10 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Hesap Onayı Bekleniyor</h2>
        <p className="text-slate-600 mb-6">
          Test oluşturabilmek için hesabınızın yönetici tarafından onaylanması gerekiyor.
        </p>
        <Link to={createPageUrl("EducatorSettings")}>
          <Button className="bg-indigo-600 hover:bg-indigo-700">Profil Ayarlarına Git</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        to={createPageUrl("EducatorDashboard")}
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Dashboard'a Dön
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Yeni Test Oluştur</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Test Başlığı *</Label>
              <Input
                id="title"
                placeholder="Örn: KPSS Genel Yetenek Deneme Sınavı"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea
                id="description"
                placeholder="Test hakkında kısa bir açıklama..."
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sınav Türü</Label>
                <Select
                  value={formData.exam_type_id}
                  onValueChange={(v) => setFormData({ ...formData, exam_type_id: v, topic_id: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {examTypes.map((exam) => (
                      <SelectItem key={exam.id} value={exam.id}>
                        {exam.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Konu</Label>
                <Select
                  value={formData.topic_id}
                  onValueChange={(v) => setFormData({ ...formData, topic_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {topics.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Fiyat (₺)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                />
              </div>

              {formData.is_timed && (
                <div className="space-y-2">
                  <Label htmlFor="duration">Süre (dakika) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    value={formData.duration_minutes}
                    onChange={(e) =>
                      setFormData({ ...formData, duration_minutes: Number(e.target.value) })
                    }
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_timed}
                  onChange={(e) => setFormData({ ...formData, is_timed: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">Süreli Test</span>
              </label>
            </div>

            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              disabled={createMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {createMutation.isPending ? "Oluşturuluyor..." : "Oluştur ve Soru Ekle"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
