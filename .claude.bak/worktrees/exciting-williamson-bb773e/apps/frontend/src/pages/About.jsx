import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { GraduationCap, Target, Users, Award, Heart, ArrowLeft } from "lucide-react";

export default function About() {
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
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Hakkımızda</h1>
          <p className="text-lg text-slate-600">
            Sınav Salonu, Türkiye'nin en kapsamlı online sınav hazırlık platformudur.
          </p>
        </div>

        <div className="space-y-12">
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{backgroundColor: 'rgba(0, 0, 205, 0.1)'}}>
                <Target className="w-6 h-6" style={{color: '#0000CD'}} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Misyonumuz</h2>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Sınavlara hazırlanan adaylara kaliteli, güncel ve etkili test içerikleri sunarak başarıya giden yolda en güvenilir rehber olmak. Her aday, kendi hızında ve istediği zaman çalışabilir, ilerlemesini takip edebilir ve hedeflerine ulaşabilir.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{backgroundColor: 'rgba(0, 0, 205, 0.1)'}}>
                <Award className="w-6 h-6" style={{color: '#0000CD'}} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Vizyonumuz</h2>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Türkiye'de sınav hazırlık alanında ilk akla gelen platform olmak. Teknoloji ve eğitimi bir araya getirerek, her adaya eşit fırsat sunmak ve eğitimde dijital dönüşümün öncüsü olmak.
            </p>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{backgroundColor: 'rgba(0, 0, 205, 0.1)'}}>
                <Heart className="w-6 h-6" style={{color: '#0000CD'}} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Değerlerimiz</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 bg-slate-50 rounded-xl">
                <h3 className="font-semibold text-slate-900 mb-2">Kalite</h3>
                <p className="text-sm text-slate-600">
                  Her test paketimiz alanında uzman eğiticiler tarafından özenle hazırlanır ve sürekli güncellenir.
                </p>
              </div>
              <div className="p-6 bg-slate-50 rounded-xl">
                <h3 className="font-semibold text-slate-900 mb-2">Şeffaflık</h3>
                <p className="text-sm text-slate-600">
                  Adaylarımızın ve eğiticilerimizin geri bildirimleriyle sürekli gelişir, açık iletişim kurarız.
                </p>
              </div>
              <div className="p-6 bg-slate-50 rounded-xl">
                <h3 className="font-semibold text-slate-900 mb-2">Erişilebilirlik</h3>
                <p className="text-sm text-slate-600">
                  Herkesin kaliteli eğitime ulaşabilmesi için uygun fiyatlı ve kolay erişilebilir içerikler sunuyoruz.
                </p>
              </div>
              <div className="p-6 bg-slate-50 rounded-xl">
                <h3 className="font-semibold text-slate-900 mb-2">İnovasyon</h3>
                <p className="text-sm text-slate-600">
                  Teknolojinin gücünden faydalanarak eğitim deneyimini sürekli iyileştiriyoruz.
                </p>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{backgroundColor: 'rgba(0, 0, 205, 0.1)'}}>
                <Users className="w-6 h-6" style={{color: '#0000CD'}} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Neden Sınav Salonu?</h2>
            </div>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{backgroundColor: 'rgba(0, 0, 205, 0.1)'}}>
                  <span className="font-semibold" style={{color: '#0000CD'}}>1</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Uzman Eğitici Kadrosu</h3>
                  <p className="text-slate-600">Alanında uzman eğiticiler ve güncel test içerikleri.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{backgroundColor: 'rgba(0, 0, 205, 0.1)'}}>
                  <span className="font-semibold" style={{color: '#0000CD'}}>2</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Detaylı Performans Analizi</h3>
                  <p className="text-slate-600">İlerlemeni takip et, güçlü ve zayıf yönlerini keşfet.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{backgroundColor: 'rgba(0, 0, 205, 0.1)'}}>
                  <span className="font-semibold" style={{color: '#0000CD'}}>3</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Her Zaman, Her Yerde</h3>
                  <p className="text-slate-600">Mobil uyumlu platformumuzla istediğin zaman, istediğin yerden çalış.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}