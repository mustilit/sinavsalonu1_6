import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, HelpCircle, Book, CreditCard, User, Settings, MessageCircle } from "lucide-react";

export default function Support() {
  const faqs = [
    {
      category: "Genel",
      icon: HelpCircle,
      questions: [
        {
          q: "Sınav Salonu nedir?",
          a: "Sınav Salonu, çeşitli sınavlara hazırlanan adaylara online test çözme imkanı sunan, alanında uzman eğiticilerin oluşturduğu içerikleri barındıran kapsamlı bir eğitim platformudur."
        },
        {
          q: "Nasıl kayıt olabilirim?",
          a: "Ana sayfadaki 'Giriş Yap' butonuna tıklayarak aday veya eğitici olarak kayıt olabilirsiniz. E-posta adresiniz ile hesap oluşturabilir ve hemen test çözmeye başlayabilirsiniz."
        },
        {
          q: "Platform ücretsiz mi?",
          a: "Kayıt olmak ücretsizdir. Testleri keşfedebilir, eğiticileri inceleyebilirsiniz. Test paketlerini satın aldıktan sonra çözmeye başlayabilirsiniz."
        }
      ]
    },
    {
      category: "Test ve İçerik",
      icon: Book,
      questions: [
        {
          q: "Testleri nasıl satın alabilirim?",
          a: "İlgilendiğiniz testi seçin, detay sayfasında 'Satın Al' butonuna tıklayın. Ödeme işlemini tamamladıktan sonra teste anında erişebilirsiniz."
        },
        {
          q: "Satın aldığım testlere ne kadar süre erişebilirim?",
          a: "Satın aldığınız test paketlerine sınırsız erişiminiz vardır. İstediğiniz zaman, istediğiniz kadar çözebilirsiniz."
        },
        {
          q: "Test sonuçlarımı nasıl görebilirim?",
          a: "'Sonuçlarım' sayfasından tüm test sonuçlarınızı, detaylı analizlerinizi ve performans grafiklerinizi inceleyebilirsiniz."
        },
        {
          q: "Hatalı soru bildirimi nasıl yapılır?",
          a: "Test çözme sırasında soru üzerindeki 'Soruyu Bildir' butonunu kullanarak hatalı olduğunu düşündüğünüz soruları bildirebilirsiniz."
        }
      ]
    },
    {
      category: "Ödeme ve İade",
      icon: CreditCard,
      questions: [
        {
          q: "Hangi ödeme yöntemlerini kabul ediyorsunuz?",
          a: "Kredi kartı ve banka kartı ile ödeme yapabilirsiniz. Tüm ödemeleriniz güvenli ödeme altyapısı üzerinden gerçekleştirilir."
        },
        {
          q: "İade politikanız nedir?",
          a: "Satın aldığınız test paketinde sorun olması durumunda 'İade Talep' sayfasından başvurabilirsiniz. Hatalı soru bildirimleriniz değerlendirilir ve haklı bulunursanız iade işleminiz gerçekleştirilir."
        }
      ]
    },
    {
      category: "Eğitici Olmak",
      icon: User,
      questions: [
        {
          q: "Eğitici olarak nasıl başvurabilirim?",
          a: "Eğitici olarak kayıt olun, profil bilgilerinizi ve uzmanlık alanlarınızı tamamlayın. Akademik doğrulama için gerekli belgeleri yükleyin. Onay sonrası test oluşturmaya başlayabilirsiniz."
        },
        {
          q: "Eğitici olarak ne kadar kazanabilirim?",
          a: "Test satışlarından belirlenen komisyon oranında gelir elde edersiniz. Satış performansınıza göre kazançlarınız artar."
        },
        {
          q: "Test oluşturma süreci nasıl işler?",
          a: "'Test Oluştur' sayfasından test bilgilerini girin, soruları ekleyin ve yayınlayın. Testleriniz onaylandıktan sonra adaylara sunulur."
        }
      ]
    },
    {
      category: "Hesap ve Ayarlar",
      icon: Settings,
      questions: [
        {
          q: "Şifremi nasıl değiştirebilirim?",
          a: "Profil ayarları sayfasından şifrenizi değiştirebilirsiniz. Mevcut şifrenizi girin ve yeni şifrenizi belirleyin."
        },
        {
          q: "Hesabımı nasıl silebilirim?",
          a: "Hesabınızı silmek için destek ekibimizle iletişime geçin. Talebiniz değerlendirildikten sonra hesabınız silinecektir."
        },
        {
          q: "Bildirim ayarlarımı nasıl yönetebilirim?",
          a: "Profil ayarları sayfasından e-posta bildirimlerini, test hatırlatmalarını ve diğer bildirimleri açıp kapatabilirsiniz."
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link 
          to={createPageUrl("Home")} 
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Ana Sayfaya Dön
        </Link>

        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Yardım ve Destek</h1>
          <p className="text-lg text-slate-600">
            Sık sorulan sorular ve size yardımcı olabilecek bilgiler
          </p>
        </div>

        <div className="space-y-8">
          {faqs.map((category, idx) => (
            <div key={idx}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{backgroundColor: 'rgba(0, 0, 205, 0.1)'}}>
                  <category.icon className="w-5 h-5" style={{color: '#0000CD'}} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">{category.category}</h2>
              </div>
              
              <div className="space-y-4">
                {category.questions.map((item, qIdx) => (
                  <details key={qIdx} className="bg-white rounded-xl border border-slate-200 overflow-hidden group">
                    <summary className="p-6 cursor-pointer font-semibold text-slate-900 hover:bg-slate-50 transition-colors list-none flex items-center justify-between">
                      <span>{item.q}</span>
                      <svg className="w-5 h-5 text-slate-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="px-6 pb-6 text-slate-600 leading-relaxed">
                      {item.a}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-slate-50 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{backgroundColor: 'rgba(0, 0, 205, 0.1)'}}>
            <MessageCircle className="w-8 h-8" style={{color: '#0000CD'}} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Sorunuz Burada Yok mu?</h2>
          <p className="text-slate-600 mb-6">
            Başka sorularınız için destek ekibimizle iletişime geçin
          </p>
          <Link to={createPageUrl("Contact")}>
            <button className="px-6 py-3 rounded-xl text-white font-medium hover:opacity-90 transition-opacity" style={{backgroundColor: '#0000CD'}}>
              İletişime Geç
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}