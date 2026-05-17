import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { User, Save, Phone, MapPin, Globe, Linkedin, Undo2, Clock, CheckCircle2, XCircle, ShoppingBag, Filter, GraduationCap } from "lucide-react";
import RefundRequestModal from "@/components/refund/RefundRequestModal";
import { Checkbox } from "@/components/ui/checkbox";

export default function ProfileSettings() {
  const [user, setUser] = useState(null);
  const [initialFormData, setInitialFormData] = useState(null);
  const [formData, setFormData] = useState({
    phone: "",
    city: "",
    website: "",
    linkedin: "",
    notification_preferences: {
      email_new_tests: true,
      email_promotions: true,
      email_educator_updates: true,
      email_test_reminders: true
    }
  });
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [searchPurchase, setSearchPurchase] = useState("");
  const [filterType, setFilterType] = useState("all"); // all, purchases, refunds
  const [searchFilter, setSearchFilter] = useState("");
  const queryClient = useQueryClient();

  const hasChanges = initialFormData && JSON.stringify(formData) !== JSON.stringify(initialFormData);

  const { data: purchases = [] } = useQuery({
    queryKey: ["userPurchases", user?.email],
    queryFn: () => user ? base44.entities.Purchase.filter({ user_email: user.email }, "-created_date") : [],
    enabled: !!user,
  });

  const { data: refundRequests = [] } = useQuery({
    queryKey: ["refundRequests", user?.email],
    queryFn: () => user ? base44.entities.RefundRequest.filter({ user_email: user.email }, "-created_date") : [],
    enabled: !!user,
  });

  const { data: examTypes = [] } = useQuery({
    queryKey: ["examTypes"],
    queryFn: () => base44.entities.ExamType.filter({ is_active: true }),
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        const initialData = {
          phone: userData.phone || "",
          city: userData.city || "",
          website: userData.website || "",
          linkedin: userData.linkedin || "",
          interested_exam_types: userData.interested_exam_types || [],
          notification_preferences: userData.notification_preferences || {
            email_new_tests: true,
            email_promotions: true,
            email_educator_updates: true,
            email_test_reminders: true
          }
        };
        setFormData(initialData);
        setInitialFormData(initialData);
      } catch (e) {
        console.log("User not logged in");
      }
    };
    loadUser();
  }, []);

  const updateMutation = useMutation({
    mutationFn: async () => {
      await base44.auth.updateMe(formData);
    },
    onSuccess: () => {
      toast.success("Profil bilgileri güncellendi");
      setInitialFormData(formData);
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
    onError: () => {
      toast.error("Güncelleme başarısız oldu");
    }
  });

  const refundMutation = useMutation({
    mutationFn: (data) => base44.entities.RefundRequest.create({
      user_email: user.email,
      user_name: user.full_name,
      purchase_id: selectedPurchase.id,
      test_package_id: selectedPurchase.test_package_id,
      test_package_title: selectedPurchase.test_package_title,
      educator_email: selectedPurchase.educator_email,
      amount: selectedPurchase.price_paid,
      reason: data.reason,
      status: "pending"
    }),
    onSuccess: () => {
      toast.success("İade talebi gönderildi");
      setRefundModalOpen(false);
      setSelectedPurchase(null);
      queryClient.invalidateQueries({ queryKey: ["refundRequests"] });
    },
    onError: () => {
      toast.error("İade talebi gönderilemedi");
    }
  });

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
        <p className="text-slate-500 mt-2">İletişim bilgilerinizi ve tercihlerinizi düzenleyin</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 lg:p-8">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900">{user.full_name}</p>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
        </div>

        <Tabs defaultValue="contact" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="contact">İletişim</TabsTrigger>
            <TabsTrigger value="notifications">Bildirimler</TabsTrigger>
            <TabsTrigger value="exams">Sınav Tercihleri</TabsTrigger>
            <TabsTrigger value="financial">Mali İşlemler</TabsTrigger>
          </TabsList>

          {/* İletişim Tab */}
          <TabsContent value="contact">
            <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="space-y-6">
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
                  <GraduationCap className="w-5 h-5 text-indigo-600" />
                  İlgilendiğim Sınavlar
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                  İlgilendiğiniz sınavları seçin, ana sayfanızda bu sınavlara ait testler önceliklendirilsin
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {examTypes.map((exam) => (
                    <label
                      key={exam.id}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        (formData.interested_exam_types || []).includes(exam.id)
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <Checkbox
                        checked={(formData.interested_exam_types || []).includes(exam.id)}
                        onCheckedChange={(checked) => {
                          const current = formData.interested_exam_types || [];
                          setFormData({
                            ...formData,
                            interested_exam_types: checked
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

          {/* Mali İşlemler Tab */}
          <TabsContent value="financial" className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              {purchases.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setRefundModalOpen(true)}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  <Undo2 className="w-4 h-4 mr-2" />
                  İade İste
                </Button>
              )}
            </div>

            {(purchases.length > 0 || refundRequests.length > 0) && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Test ara..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="pl-10"
                    />
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={filterType === "all" ? "default" : "outline"}
                      onClick={() => setFilterType("all")}
                      size="sm"
                      className={filterType === "all" ? "bg-indigo-600" : ""}
                    >
                      Tümü
                    </Button>
                    <Button
                      variant={filterType === "purchases" ? "default" : "outline"}
                      onClick={() => setFilterType("purchases")}
                      size="sm"
                      className={filterType === "purchases" ? "bg-indigo-600" : ""}
                    >
                      Satın Almalar
                    </Button>
                    <Button
                      variant={filterType === "refunds" ? "default" : "outline"}
                      onClick={() => setFilterType("refunds")}
                      size="sm"
                      className={filterType === "refunds" ? "bg-indigo-600" : ""}
                    >
                      İadeler
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Satın Almalar */}
                  {(filterType === "all" || filterType === "purchases") && purchases
                    .filter((p) => p.test_package_title.toLowerCase().includes(searchFilter.toLowerCase()))
                    .map((purchase) => (
                      <div key={`purchase-${purchase.id}`} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <ShoppingBag className="w-5 h-5 text-indigo-600" />
                              <p className="font-medium text-slate-900">{purchase.test_package_title}</p>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                              <span>₺{purchase.price_paid}</span>
                              <span>{new Date(purchase.created_date).toLocaleDateString('tr-TR')}</span>
                            </div>
                          </div>
                          <span className="text-sm font-medium text-indigo-600">Satın Alındı</span>
                        </div>
                      </div>
                    ))}

                  {/* İade Talepleri */}
                  {(filterType === "all" || filterType === "refunds") && refundRequests
                    .filter((r) => r.test_package_title.toLowerCase().includes(searchFilter.toLowerCase()))
                    .map((request) => {
                      const statusConfig = {
                        pending: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50", label: "Beklemede" },
                        approved: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", label: "Onaylandı" },
                        rejected: { icon: XCircle, color: "text-rose-600", bg: "bg-rose-50", label: "Reddedildi" }
                      };
                      const config = statusConfig[request.status] || statusConfig.pending;
                      const Icon = config.icon;

                      return (
                        <div key={`refund-${request.id}`} className={`${config.bg} rounded-xl p-4 border border-slate-200`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Icon className={`w-5 h-5 ${config.color}`} />
                                <p className="font-medium text-slate-900">{request.test_package_title}</p>
                              </div>
                              <p className="text-sm text-slate-600 mb-2">{request.reason}</p>
                              <div className="flex items-center gap-4 text-sm text-slate-500">
                                <span>₺{request.amount}</span>
                                <span>{new Date(request.created_date).toLocaleDateString('tr-TR')}</span>
                              </div>
                            </div>
                            <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                          </div>
                        </div>
                      );
                    })}

                  {/* Sonuç bulunamadı mesajı */}
                  {((filterType === "all" && purchases.filter((p) => p.test_package_title.toLowerCase().includes(searchFilter.toLowerCase())).length === 0 && refundRequests.filter((r) => r.test_package_title.toLowerCase().includes(searchFilter.toLowerCase())).length === 0) ||
                    (filterType === "purchases" && purchases.filter((p) => p.test_package_title.toLowerCase().includes(searchFilter.toLowerCase())).length === 0) ||
                    (filterType === "refunds" && refundRequests.filter((r) => r.test_package_title.toLowerCase().includes(searchFilter.toLowerCase())).length === 0)) && (
                    <p className="text-center text-slate-500 py-8">Sonuç bulunamadı</p>
                  )}
                </div>
              </div>
            )}

            {purchases.length === 0 && refundRequests.length === 0 && (
              <p className="text-center text-slate-500 py-8">Mali işleminiz bulunmamaktadır</p>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Purchase Selection Modal */}
      {refundModalOpen && !selectedPurchase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-slate-900 mb-4">İade İste</h2>
            <Input
              placeholder="Test ara..."
              value={searchPurchase}
              onChange={(e) => setSearchPurchase(e.target.value)}
              className="mb-4"
            />
            <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
              {purchases
                .filter((p) => p.test_package_title.toLowerCase().includes(searchPurchase.toLowerCase()))
                .map((purchase) => (
                  <button
                    key={purchase.id}
                    onClick={() => {
                      setSelectedPurchase(purchase);
                      setSearchPurchase("");
                    }}
                    className="w-full text-left p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <p className="font-medium text-slate-900">{purchase.test_package_title}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                      <span>₺{purchase.price_paid}</span>
                      <span>{new Date(purchase.created_date).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </button>
                ))}
              {purchases.filter((p) => p.test_package_title.toLowerCase().includes(searchPurchase.toLowerCase())).length === 0 && (
                <p className="text-center text-slate-500 py-4">Test bulunamadı</p>
              )}
            </div>
            <Button variant="outline" onClick={() => {
              setRefundModalOpen(false);
              setSearchPurchase("");
            }} className="w-full">
              İptal
            </Button>
          </div>
        </div>
      )}

      <RefundRequestModal
        open={refundModalOpen && !!selectedPurchase}
        onClose={() => {
          setRefundModalOpen(false);
          setSelectedPurchase(null);
        }}
        purchase={selectedPurchase}
        onSubmit={(data) => refundMutation.mutate(data)}
        isLoading={refundMutation.isPending}
      />
    </div>
  );
}