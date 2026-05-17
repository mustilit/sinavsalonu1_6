import { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Handshake, TrendingUp, Users, Award, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function Partnership() {
  const [formData, setFormData] = useState({
    company_name: "",
    name: "",
    email: "",
    phone: "",
    message: ""
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.company_name || !formData.name || !formData.email || !formData.message) {
      toast.error("Lütfen tüm zorunlu alanları doldurun");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      toast.success("Başvurunuz alındı! En kısa sürede sizinle iletişime geçeceğiz.");
      setFormData({ company_name: "", name: "", email: "", phone: "", message: "" });
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link 
          to={createPageUrl("Home")} 
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Ana Sayfaya Dön
        </Link>

        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{backgroundColor: 'rgba(0, 0, 205, 0.1)'}}>
              <Handshake className="w-6 h-6" style={{color: '#0000CD'}} />
            </div>
            <h1 className="text-4xl font-bold text-slate-900">İş Ortaklığı</h1>
          </div>
          <p className="text-lg text-slate-600">
            Sınav Salonu ile iş ortağı olun, eğitim teknolojilerinde fark yaratın.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{backgroundColor: 'rgba(0, 0, 205, 0.1)'}}>
                  <TrendingUp className="w-6 h-6" style={{color: '#0000CD'}} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Kurumsal Satış Ortaklığı</h3>
                  <p className="text-slate-600 text-sm">
                    Şirketiniz veya kurumunuz için özel test paketleri ve toplu satış fırsatları sunuyoruz.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{backgroundColor: 'rgba(0, 0, 205, 0.1)'}}>
                  <Users className="w-6 h-6" style={{color: '#0000CD'}} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Eğitim Kurumları İşbirliği</h3>
                  <p className="text-slate-600 text-sm">
                    Dershaneler, üniversiteler ve eğitim kurumları için özel entegrasyon ve içerik işbirlikleri.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{backgroundColor: 'rgba(0, 0, 205, 0.1)'}}>
                  <Award className="w-6 h-6" style={{color: '#0000CD'}} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Teknoloji Ortaklığı</h3>
                  <p className="text-slate-600 text-sm">
                    API entegrasyonları ve teknoloji çözümleri geliştirmek isteyen firmalar için işbirliği fırsatları.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Ortaklık Başvurusu</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Şirket Adı *
                </label>
                <Input
                  placeholder="Şirket adınız"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Yetkili Kişi *
                </label>
                <Input
                  placeholder="Adınız ve soyadınız"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  E-posta *
                </label>
                <Input
                  type="email"
                  placeholder="ornek@firma.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Telefon
                </label>
                <Input
                  type="tel"
                  placeholder="+90 5XX XXX XX XX"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Ortaklık Detayları *
                </label>
                <Textarea
                  placeholder="Ortaklık türü ve detaylar hakkında bilgi verin..."
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                />
              </div>
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full"
                style={{backgroundColor: '#0000CD'}}
              >
                {loading ? "Gönderiliyor..." : "Başvuruyu Gönder"}
              </Button>
            </form>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">İş Ortağı Olmanın Avantajları</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{backgroundColor: 'rgba(0, 0, 205, 0.1)'}}>
                <CheckCircle className="w-8 h-8" style={{color: '#0000CD'}} />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Özel Fiyatlandırma</h3>
              <p className="text-sm text-slate-600">Kurumsal müşteriler için özel indirimli fiyatlar</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{backgroundColor: 'rgba(0, 0, 205, 0.1)'}}>
                <CheckCircle className="w-8 h-8" style={{color: '#0000CD'}} />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Öncelikli Destek</h3>
              <p className="text-sm text-slate-600">7/24 öncelikli teknik destek hizmeti</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{backgroundColor: 'rgba(0, 0, 205, 0.1)'}}>
                <CheckCircle className="w-8 h-8" style={{color: '#0000CD'}} />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Özel İçerik</h3>
              <p className="text-sm text-slate-600">İhtiyacınıza özel test içerikleri</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{backgroundColor: 'rgba(0, 0, 205, 0.1)'}}>
                <CheckCircle className="w-8 h-8" style={{color: '#0000CD'}} />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Detaylı Raporlama</h3>
              <p className="text-sm text-slate-600">Kapsamlı analiz ve raporlama araçları</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}