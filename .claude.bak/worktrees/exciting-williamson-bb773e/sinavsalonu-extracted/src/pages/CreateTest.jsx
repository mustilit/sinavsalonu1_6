import { useState, useEffect } from "react";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
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

export default function CreateTest() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    exam_type_id: "",
    price: 0,
    duration_minutes: 60,
    difficulty: "medium",
    is_timed: false,
    has_solutions: false,
    cover_image: "",
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        // Check if educator is approved
        if (userData.user_type === "educator" && userData.educator_status !== "approved") {
          toast.error("Test oluşturmak için hesabınızın onaylanması gerekiyor");
          setTimeout(() => {
            window.location.href = createPageUrl("EducatorSettings");
          }, 2000);
        }
      } catch (e) {}
    };
    loadUser();
  }, []);

  const { data: examTypes = [] } = useQuery({
    queryKey: ["examTypes"],
    queryFn: () => base44.entities.ExamType.filter({ is_active: true }),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const examType = examTypes.find(e => e.id === data.exam_type_id);
      return await base44.entities.TestPackage.create({
        ...data,
        exam_type_name: examType?.name || "",
        educator_id: user.id,
        educator_name: user.full_name,
        educator_email: user.email,
        question_count: 0,
        is_published: false,
        total_sales: 0,
        average_rating: 0,
      });
    },
    onSuccess: (newTest) => {
      toast.success("Test paketi oluşturuldu!");
      window.location.href = createPageUrl("EditTest") + `?id=${newTest.id}`;
    },
    onError: () => {
      toast.error("Test oluşturulurken hata oluştu");
    }
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, cover_image: file_url });
      toast.success("Görsel yüklendi");
    } catch (error) {
      toast.error("Görsel yüklenirken hata oluştu");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title) {
      toast.error("Lütfen test başlığı girin");
      return;
    }
    createMutation.mutate(formData);
  };

  if (user && user.user_type === "educator" && user.educator_status !== "approved") {
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
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            Profil Ayarlarına Git
          </Button>
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
          <CardTitle>Yeni Test Paketi Oluştur</CardTitle>
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

            <div className="space-y-2">
              <Label htmlFor="cover_image">Kapak Görseli</Label>
              {formData.cover_image && (
                <div className="relative w-full h-40 rounded-lg overflow-hidden mb-2">
                  <img src={formData.cover_image} alt="Kapak" className="w-full h-full object-cover" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => setFormData({ ...formData, cover_image: "" })}
                  >
                    Kaldır
                  </Button>
                </div>
              )}
              <Input
                id="cover_image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
              />
              {uploading && <p className="text-sm text-slate-500">Yükleniyor...</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sınav Türü</Label>
                <Select 
                  value={formData.exam_type_id} 
                  onValueChange={(v) => setFormData({ ...formData, exam_type_id: v })}
                >
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
                <Label>Zorluk</Label>
                <Select 
                  value={formData.difficulty} 
                  onValueChange={(v) => setFormData({ ...formData, difficulty: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Kolay</SelectItem>
                    <SelectItem value="medium">Orta</SelectItem>
                    <SelectItem value="hard">Zor</SelectItem>
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
                    onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
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
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.has_solutions}
                  onChange={(e) => setFormData({ ...formData, has_solutions: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">Çözümlü Test</span>
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