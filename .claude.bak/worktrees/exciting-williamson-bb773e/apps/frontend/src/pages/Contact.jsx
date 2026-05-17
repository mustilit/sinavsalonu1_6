import { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MapPin, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Lütfen tüm zorunlu alanları doldurun");
      return;
    }
    setLoading(true);
    // Simulated submission
    setTimeout(() => {
      toast.success("Mesajınız başarıyla gönderildi! En kısa sürede size dönüş yapacağız.");
      setFormData({ name: "", email: "", subject: "", message: "" });
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
          <h1 className="text-4xl font-bold text-slate-900 mb-4">İletişim</h1>
          <p className="text-lg text-slate-600">
            Sorularınız veya önerileriniz için bizimle iletişime geçin.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-200 p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Mesaj Gönderin</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Ad Soyad *
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
                      placeholder="ornek@mail.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Konu
                  </label>
                  <Input
                    placeholder="Mesajınızın konusu"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Mesajınız *
                  </label>
                  <Textarea
                    placeholder="Mesajınızı buraya yazın..."
                    rows={6}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full sm:w-auto"
                  style={{backgroundColor: '#0000CD'}}
                >
                  {loading ? "Gönderiliyor..." : "Mesajı Gönder"}
                </Button>
              </form>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{backgroundColor: 'rgba(0, 0, 205, 0.1)'}}>
                  <Mail className="w-6 h-6" style={{color: '#0000CD'}} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">E-posta</h3>
                  <p className="text-slate-600 text-sm">info@sinavsalonu.com</p>
                  <p className="text-slate-600 text-sm">destek@sinavsalonu.com</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{backgroundColor: 'rgba(0, 0, 205, 0.1)'}}>
                  <MapPin className="w-6 h-6" style={{color: '#0000CD'}} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Adres</h3>
                  <p className="text-slate-600 text-sm">
                    Sınav Salonu Eğitim Teknolojileri A.Ş.<br />
                    Maslak Mahallesi, Büyükdere Caddesi<br />
                    No: 123, Sarıyer<br />
                    İstanbul, Türkiye
                  </p>
                </div>
              </div>
            </div>


          </div>
        </div>
      </div>
    </div>
  );
}