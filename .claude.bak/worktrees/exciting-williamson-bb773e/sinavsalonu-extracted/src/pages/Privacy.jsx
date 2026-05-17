import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Shield } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
              <Shield className="w-6 h-6" style={{color: '#0000CD'}} />
            </div>
            <h1 className="text-4xl font-bold text-slate-900">Gizlilik Politikası</h1>
          </div>
          <p className="text-slate-600">Son güncelleme: 17 Şubat 2026</p>
        </div>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Genel Bilgiler</h2>
            <p className="text-slate-600 leading-relaxed">
              Sınav Salonu olarak, kullanıcılarımızın gizliliğine saygı duyuyor ve kişisel verilerinizin korunmasına büyük önem veriyoruz. Bu Gizlilik Politikası, platformumuz üzerinde toplanan, işlenen ve saklanan kişisel verilere ilişkin uygulamalarımızı açıklamaktadır.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Toplanan Veriler</h2>
            <p className="text-slate-600 leading-relaxed mb-3">
              Platform kullanımı sırasında aşağıdaki kişisel veriler toplanabilir:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li>Ad, soyad, e-posta adresi ve telefon numarası</li>
              <li>Hesap oluşturma ve giriş bilgileri</li>
              <li>Test sonuçları ve performans verileri</li>
              <li>Ödeme bilgileri (güvenli ödeme sistemleri aracılığıyla)</li>
              <li>Platform kullanım istatistikleri ve tercihleri</li>
              <li>İletişim kayıtları ve geri bildirimler</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Verilerin Kullanımı</h2>
            <p className="text-slate-600 leading-relaxed mb-3">
              Toplanan kişisel veriler aşağıdaki amaçlarla kullanılır:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li>Platformun sunulması ve işletilmesi</li>
              <li>Kullanıcı hesaplarının yönetimi</li>
              <li>Test sonuçlarının saklanması ve raporlanması</li>
              <li>Ödeme işlemlerinin gerçekleştirilmesi</li>
              <li>Müşteri destek hizmetlerinin sağlanması</li>
              <li>Platform iyileştirmeleri ve yeni özelliklerin geliştirilmesi</li>
              <li>Yasal yükümlülüklerin yerine getirilmesi</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Veri Güvenliği</h2>
            <p className="text-slate-600 leading-relaxed">
              Kişisel verilerinizin güvenliğini sağlamak için endüstri standardı güvenlik önlemleri kullanıyoruz. Verileriniz şifrelenmiş bağlantılar üzerinden iletilir ve güvenli sunucularda saklanır. Yetkisiz erişim, değişiklik veya ifşaya karşı teknik ve idari önlemler alınmıştır.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Veri Paylaşımı</h2>
            <p className="text-slate-600 leading-relaxed">
              Kişisel verileriniz üçüncü taraflarla paylaşılmaz, satılmaz veya kiralanmaz. Ancak, aşağıdaki durumlarda verileriniz paylaşılabilir:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-600 mt-3">
              <li>Yasal zorunluluklar ve mahkeme kararları</li>
              <li>Ödeme işlemleri için güvenilir ödeme sağlayıcıları</li>
              <li>Platform altyapısı için bulut hizmet sağlayıcıları</li>
              <li>Açık izninizle belirli durumlar</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Kullanıcı Hakları</h2>
            <p className="text-slate-600 leading-relaxed mb-3">
              KVKK kapsamında aşağıdaki haklara sahipsiniz:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-600">
              <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
              <li>İşlenmiş kişisel verileriniz hakkında bilgi talep etme</li>
              <li>Kişisel verilerinizin düzeltilmesini isteme</li>
              <li>Kişisel verilerinizin silinmesini veya yok edilmesini isteme</li>
              <li>Kişisel verilerinizin aktarıldığı üçüncü kişileri bilme</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Çerezler (Cookies)</h2>
            <p className="text-slate-600 leading-relaxed">
              Platformumuz, kullanıcı deneyimini iyileştirmek için çerezler kullanır. Çerezler, tarayıcınız tarafından bilgisayarınızda saklanan küçük metin dosyalarıdır. Tarayıcı ayarlarınızdan çerezleri yönetebilir veya engelleyebilirsiniz.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Değişiklikler</h2>
            <p className="text-slate-600 leading-relaxed">
              Bu Gizlilik Politikası zaman zaman güncellenebilir. Önemli değişiklikler e-posta yoluyla bildirilecektir. Platform kullanımına devam etmeniz, güncellenmiş politikayı kabul ettiğiniz anlamına gelir.
            </p>
          </section>


        </div>
      </div>
    </div>
  );
}