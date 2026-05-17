import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { User, Save, Globe, Linkedin, Phone, MapPin, FileText, Upload, CheckCircle, GraduationCap, ShieldCheck, Bell, Award, Camera } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";

export default function EducatorSettings() {
  const { user, checkAppState } = useAuth();
  const [initialFormData, setInitialFormData] = useState(null);
  const [formData, setFormData] = useState({
    education: "",
    bio: "",
    phone: "",
    city: "",
    website: "",
    linkedin: "",
    google_scholar_url: "",
    cv_url: "",
    profile_image_url: "",
    specialized_exam_types: [],
    notification_preferences: {
      email_new_tests: true,
      email_promotions: true,
      email_educator_updates: true,
      email_test_reminders: true
    }
  });
  const [uploadingCV, setUploadingCV] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const queryClient = useQueryClient();

  const hasChanges = initialFormData && JSON.stringify(formData) !== JSON.stringify(initialFormData);

  const { data: examTypes = [] } = useQuery({
    queryKey: ["examTypes"],
    queryFn: () => base44.entities.ExamType.filter({ is_active: true }),
  });

  useEffect(() => {
    if (!user) return;
    const initialData = {
      education: user.education || "",
      bio: user.bio || "",
      phone: user.phone || "",
      city: user.city || "",
      website: user.website || "",
      linkedin: user.linkedin || "",
      google_scholar_url: user.google_scholar_url || "",
      cv_url: user.cv_url || "",
      profile_image_url: user.profile_image_url || "",
      specialized_exam_types: user.specialized_exam_types || [],
      notification_preferences: user.notification_preferences || {
        email_new_tests: true,
        email_promotions: true,
        email_educator_updates: true,
        email_test_reminders: true
      }
    };
    setFormData(initialData);
    setInitialFormData(initialData);
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      await base44.auth.updateMe(formData);
      // Eğitici profil bilgilerini EducatorProfile entitesine kaydet
      try {
        const existingProfiles = await base44.entities.EducatorProfile.filter({ educator_email: user.email });
        if (existingProfiles.length > 0) {
          await base44.entities.EducatorProfile.update(existingProfiles[0].id, {
            educator_email: user.email,
            educator_name: user.full_name,
            bio: formData.bio,
            education: formData.education,
            website: formData.website,
            linkedin: formData.linkedin,
            specialized_exam_types: formData.specialized_exam_types,
            profile_image_url: formData.profile_image_url
          });
        } else {
          await base44.entities.EducatorProfile.create({
            educator_email: user.email,
            educator_name: user.full_name,
            bio: formData.bio,
            education: formData.education,
            website: formData.website,
            linkedin: formData.linkedin,
            specialized_exam_types: formData.specialized_exam_types,
            profile_image_url: formData.profile_image_url
          });
        }
      } catch (e) {
        console.log("EducatorProfile sync error:", e);
      }
    },
    onSuccess: () => {
      toast.success("Profil bilgileri güncellendi");
      setInitialFormData(formData);
      queryClient.invalidateQueries({ queryKey: ["educatorUser"] });
    },
    onError: () => {
      toast.error("Güncelleme başarısız oldu");
    }
  });

  const resubmitApplicationMutation = useMutation({
    mutationFn: async () => {
      await base44.auth.updateMe({ 
        educator_status: "pending",
        rejection_reason: null 
      });
    },
    onSuccess: async () => {
      toast.success("Başvurunuz yeniden gönderildi");
      await checkAppState();
      queryClient.invalidateQueries({ queryKey: ["educatorUser"] });
    },
  });

  const handleCVUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const allowedTypes = ['application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Lütfen PDF dosyası yükleyin");
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Dosya boyutu en fazla 5MB olabilir");
      return;
    }

    setUploadingCV(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, cv_url: file_url });
      toast.success("CV başarıyla yüklendi");
    } catch (error) {
      toast.error("CV yüklenemedi");
    } finally {
      setUploadingCV(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Lütfen JPG, PNG veya WebP formatında resim yükleyin");
      return;
    }

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Resim boyutu en fazla 2MB olabilir");
      return;
    }

    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, profile_image_url: file_url });
      toast.success("Profil resmi başarıyla yüklendi");
    } catch (error) {
      toast.error("Resim yüklenemedi");
    } finally {
      setUploadingImage(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Profil Ayarları</h1>
        <p className="text-slate-500 mt-2">Profil bilgilerinizi güncelleyin</p>
      </div>

      {/* Rejection Notice */}
      {user.educator_status === "rejected" && user.rejection_reason && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-rose-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-rose-900 mb-2">Başvurunuz Reddedildi</h3>
              <p className="text-sm text-rose-700 mb-4">
                <strong>Red Nedeni:</strong> {user.rejection_reason}
              </p>
              <p className="text-sm text-rose-600 mb-4">
                Lütfen profilinizi güncelleyin ve başvurunuzu yeniden gönderin.
              </p>
              <Button
                onClick={() => resubmitApplicationMutation.mutate()}
                disabled={resubmitApplicationMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700"
              >
                {resubmitApplicationMutation.isPending ? "Gönderiliyor..." : "Başvuruyu Yeniden Gönder"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Notice */}
      {user.educator_status === "pending" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-900 mb-2">Hesap Onayı Bekleniyor</h3>
              <p className="text-sm text-amber-700">
                Eğitici başvurunuz yönetici tarafından inceleniyor. Onay sürecini hızlandırmak için lütfen tüm bilgilerinizi eksiksiz doldurun.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Approved Notice */}
      {user.educator_status === "approved" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-emerald-900 mb-2">Hesabınız Onaylandı</h3>
              <p className="text-sm text-emerald-700">
                Artık test oluşturabilir ve profil sayfanız adaylar tarafından görüntülenebilir.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 lg:p-8">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
          <div className="relative group">
            {formData.profile_image_url ? (
              <img 
                src={formData.profile_image_url} 
                alt={user.full_name}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-indigo-600" />
              </div>
            )}
            <button
              type="button"
              onClick={() => document.getElementById('profile-image-upload').click()}
              disabled={uploadingImage}
              className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Camera className="w-6 h-6 text-white" />
            </button>
            <input
              id="profile-image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900">{user.full_name}</p>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="profile">Profil</TabsTrigger>
            <TabsTrigger value="verification">Doğrulama</TabsTrigger>
            <TabsTrigger value="contact">İletişim</TabsTrigger>
            <TabsTrigger value="exams">Sınav Tercihleri</TabsTrigger>
            <TabsTrigger value="notifications">Bildirimler</TabsTrigger>
          </TabsList>

          {/* Profil Tab */}
          <TabsContent value="profile">
            <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-600" />
                  Profil Bilgileri
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="education">Mezuniyet Bilgisi</Label>
                    <Input
                      id="education"
                      placeholder="Örn: İstanbul Üniversitesi - Matematik Bölümü"
                      value={formData.education}
                      onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                      className="mt-2"
                    />
                    <p className="text-xs text-slate-500 mt-1">Mezun olduğunuz üniversite ve bölüm bilgisi</p>
                  </div>

                  <div>
                    <Label htmlFor="bio">Tanıtım Metni</Label>
                    <Textarea
                      id="bio"
                      placeholder="Kendinizi tanıtın, uzmanlık alanlarınızdan bahsedin..."
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      className="mt-2 min-h-32"
                    />
                    <p className="text-xs text-slate-500 mt-1">Profil sayfanızda görünecek tanıtım metni</p>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={updateMutation.isPending || !hasChanges}
              >
                <Save className="w-4 h-4 mr-2" />
                {updateMutation.isPending ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
              </Button>
            </form>
          </TabsContent>

          {/* Doğrulama Tab */}
          <TabsContent value="verification">
            <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  Akademik Doğrulama
                </h3>

                <div className="space-y-6">
              <div>
                <Label htmlFor="google_scholar" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Google Scholar Profil Linki
                </Label>
                <Input
                  id="google_scholar"
                  placeholder="https://scholar.google.com/citations?user=..."
                  value={formData.google_scholar_url}
                  onChange={(e) => setFormData({ ...formData, google_scholar_url: e.target.value })}
                  className="mt-2"
                />
                <p className="text-xs text-slate-500 mt-1">Akademik geçmişinizi doğrulamak için Google Scholar profil linkinizi ekleyin</p>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  CV Yükle
                </Label>
                <div className="mt-2">
                  {formData.cv_url ? (
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-emerald-900">CV yüklendi</p>
                        <a 
                          href={formData.cv_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-600 hover:underline"
                        >
                          Dosyayı görüntüle
                        </a>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('cv-upload').click()}
                        disabled={uploadingCV}
                      >
                        Değiştir
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => document.getElementById('cv-upload').click()}
                      disabled={uploadingCV}
                      className="w-full p-6 border-2 border-dashed border-slate-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors disabled:opacity-50"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-8 h-8 text-slate-400" />
                        <p className="text-sm font-medium text-slate-900">
                          {uploadingCV ? "Yükleniyor..." : "CV Yükle"}
                        </p>
                        <p className="text-xs text-slate-500">PDF (Max 5MB)</p>
                      </div>
                    </button>
                  )}
                  <input
                    id="cv-upload"
                    type="file"
                    accept=".pdf"
                    onChange={handleCVUpload}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">CV'nizi yükleyerek profesyonel geçmişinizi adaylara gösterebilirsiniz</p>
                </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={updateMutation.isPending || !hasChanges}
              >
                <Save className="w-4 h-4 mr-2" />
                {updateMutation.isPending ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
              </Button>
            </form>
          </TabsContent>

          {/* İletişim Tab */}
          <TabsContent value="contact">
            <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-indigo-600" />
                  İletişim Bilgileri
                </h3>
            
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Telefon
                </Label>
                <Input
                  id="phone"
                  placeholder="0532 123 45 67"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="city" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Şehir
                </Label>
                <Input
                  id="city"
                  placeholder="İstanbul"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="website" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Website/Blog
                </Label>
                <Input
                  id="website"
                  placeholder="https://example.com"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="linkedin" className="flex items-center gap-2">
                  <Linkedin className="w-4 h-4" />
                  LinkedIn
                </Label>
                <Input
                  id="linkedin"
                  placeholder="https://linkedin.com/in/username"
                  value={formData.linkedin}
                  onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                  className="mt-2"
                />
                </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={updateMutation.isPending || !hasChanges}
              >
                <Save className="w-4 h-4 mr-2" />
                {updateMutation.isPending ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
              </Button>
            </form>
          </TabsContent>

          {/* Sınav Tercihleri Tab */}
          <TabsContent value="exams">
            <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600" />
                  Uzmanlık Alanlarım
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                  Hangi sınavlar için hazırlık konusunda uzman olduğunuzu seçin. Bu bilgi profil sayfanızda görünecektir.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {examTypes.map((exam) => (
                    <label
                      key={exam.id}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        (formData.specialized_exam_types || []).includes(exam.id)
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <Checkbox
                        checked={(formData.specialized_exam_types || []).includes(exam.id)}
                        onCheckedChange={(checked) => {
                          const current = formData.specialized_exam_types || [];
                          setFormData({
                            ...formData,
                            specialized_exam_types: checked
                              ? [...current, exam.id]
                              : current.filter(id => id !== exam.id)
                          });
                        }}
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{exam.name}</p>
                        {exam.description && (
                          <p className="text-sm text-slate-500 mt-1">{exam.description}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                {examTypes.length === 0 && (
                  <p className="text-center text-slate-500 py-8">Sınav türü bulunamadı</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={updateMutation.isPending || !hasChanges}
              >
                <Save className="w-4 h-4 mr-2" />
                {updateMutation.isPending ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
              </Button>
            </form>
          </TabsContent>

          {/* Bildirimler Tab */}
          <TabsContent value="notifications">
            <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-indigo-600" />
                  Bildirim Tercihleri
                </h3>
            
                <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">Yeni Test Bildirimleri</p>
                  <p className="text-sm text-slate-500">Yeni testler yayınlandığında bildirim al</p>
                </div>
                <Switch
                  checked={formData.notification_preferences.email_new_tests}
                  onCheckedChange={(checked) => 
                    setFormData({ 
                      ...formData, 
                      notification_preferences: { 
                        ...formData.notification_preferences, 
                        email_new_tests: checked 
                      }
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">Kampanya ve Promosyonlar</p>
                  <p className="text-sm text-slate-500">İndirimler ve özel fırsatlar hakkında bilgi al</p>
                </div>
                <Switch
                  checked={formData.notification_preferences.email_promotions}
                  onCheckedChange={(checked) => 
                    setFormData({ 
                      ...formData, 
                      notification_preferences: { 
                        ...formData.notification_preferences, 
                        email_promotions: checked 
                      }
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">Eğitici Güncellemeleri</p>
                  <p className="text-sm text-slate-500">Takip ettiğim eğiticilerden güncellemeler al</p>
                </div>
                <Switch
                  checked={formData.notification_preferences.email_educator_updates}
                  onCheckedChange={(checked) => 
                    setFormData({ 
                      ...formData, 
                      notification_preferences: { 
                        ...formData.notification_preferences, 
                        email_educator_updates: checked 
                      }
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">Test Hatırlatmaları</p>
                  <p className="text-sm text-slate-500">Başladığın testler için hatırlatma al</p>
                </div>
                <Switch
                  checked={formData.notification_preferences.email_test_reminders}
                  onCheckedChange={(checked) => 
                    setFormData({ 
                      ...formData, 
                      notification_preferences: { 
                        ...formData.notification_preferences, 
                        email_test_reminders: checked 
                      }
                    })
                  }
                />
                </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={updateMutation.isPending || !hasChanges}
              >
                <Save className="w-4 h-4 mr-2" />
                {updateMutation.isPending ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}