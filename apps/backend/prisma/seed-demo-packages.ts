/**
 * Demo seed: 10 TestPackage, her birinde 2 ExamTest, her testte 10 ExamQuestion.
 * Tüm kayıtlar educator@demo.com (rol EDUCATOR) altında.
 * Farklı sınav türleri kullanılır. Bir testte mediaUrl ile görsel sorular vardır.
 *
 * Çalıştırma:
 *   cd apps/backend
 *   npx tsx prisma/seed-demo-packages.ts
 */
import { PrismaClient, TestStatus } from '@prisma/client';

const prisma = new PrismaClient();

type QuestionDef = {
  content: string;
  mediaUrl?: string;
  options: Array<{ content: string; isCorrect: boolean; mediaUrl?: string }>;
  solutionText?: string;
};

type TestDef = {
  title: string;
  duration: number; // minutes
  questions: QuestionDef[];
};

type PackageDef = {
  title: string;
  description: string;
  priceCents: number;
  examTypeSlug: string;
  tests: [TestDef, TestDef];
};

// Helper — 10 soruluk standart genel set (matematik/türkçe/genel)
function buildGenericQuestions(prefix: string): QuestionDef[] {
  const base: QuestionDef[] = [
    {
      content: `${prefix} — 2 + 3 × 4 işleminin sonucu kaçtır?`,
      options: [
        { content: '14', isCorrect: true },
        { content: '20', isCorrect: false },
        { content: '24', isCorrect: false },
        { content: '11', isCorrect: false },
      ],
      solutionText: 'Çarpma toplamadan önce yapılır: 3×4=12, 12+2=14.',
    },
    {
      content: `${prefix} — Aşağıdaki sayılardan hangisi asal sayıdır?`,
      options: [
        { content: '9', isCorrect: false },
        { content: '15', isCorrect: false },
        { content: '17', isCorrect: true },
        { content: '21', isCorrect: false },
      ],
      solutionText: '17 sadece 1 ve kendisine bölünür; asaldır.',
    },
    {
      content: `${prefix} — "Kitap" kelimesinin çoğul hâli aşağıdakilerden hangisidir?`,
      options: [
        { content: 'Kitapcık', isCorrect: false },
        { content: 'Kitaplar', isCorrect: true },
        { content: 'Kitabı', isCorrect: false },
        { content: 'Kitabımız', isCorrect: false },
      ],
      solutionText: 'Türkçede çoğul eki -ler/-lardır: kitap+lar = kitaplar.',
    },
    {
      content: `${prefix} — Türkiye'nin başkenti aşağıdakilerden hangisidir?`,
      options: [
        { content: 'İstanbul', isCorrect: false },
        { content: 'İzmir', isCorrect: false },
        { content: 'Ankara', isCorrect: true },
        { content: 'Bursa', isCorrect: false },
      ],
      solutionText: 'Cumhuriyet ilan edildiğinde başkent Ankara seçildi.',
    },
    {
      content: `${prefix} — Su'nun kimyasal formülü nedir?`,
      options: [
        { content: 'H₂O', isCorrect: true },
        { content: 'CO₂', isCorrect: false },
        { content: 'O₂', isCorrect: false },
        { content: 'NaCl', isCorrect: false },
      ],
      solutionText: 'İki hidrojen ve bir oksijen atomu: H₂O.',
    },
    {
      content: `${prefix} — Bir üçgenin iç açıları toplamı kaç derecedir?`,
      options: [
        { content: '90°', isCorrect: false },
        { content: '180°', isCorrect: true },
        { content: '270°', isCorrect: false },
        { content: '360°', isCorrect: false },
      ],
      solutionText: 'Düzlemde her üçgenin iç açıları toplamı 180°dir.',
    },
    {
      content: `${prefix} — "Erken kalkan yol alır." atasözünün anlamı nedir?`,
      options: [
        { content: 'Çalışkanlık ödüllendirilir', isCorrect: true },
        { content: 'Geç yatan başarısız olur', isCorrect: false },
        { content: 'Yollar sabah açıktır', isCorrect: false },
        { content: 'Sabah trafiği yoğundur', isCorrect: false },
      ],
      solutionText: 'İşine erken başlayan daha çok ilerleme kaydeder anlamındadır.',
    },
    {
      content: `${prefix} — 144'ün karekökü kaçtır?`,
      options: [
        { content: '10', isCorrect: false },
        { content: '11', isCorrect: false },
        { content: '12', isCorrect: true },
        { content: '14', isCorrect: false },
      ],
      solutionText: '12 × 12 = 144 olduğundan √144 = 12.',
    },
    {
      content: `${prefix} — Dünya'nın doğal uydusunun adı nedir?`,
      options: [
        { content: 'Mars', isCorrect: false },
        { content: 'Venüs', isCorrect: false },
        { content: 'Ay', isCorrect: true },
        { content: 'Güneş', isCorrect: false },
      ],
      solutionText: 'Ay, Dünya etrafında dolanan tek doğal uydudur.',
    },
    {
      content: `${prefix} — "Bilgisayar" kelimesi hangi sözcük türündendir?`,
      options: [
        { content: 'Sıfat', isCorrect: false },
        { content: 'İsim', isCorrect: true },
        { content: 'Zarf', isCorrect: false },
        { content: 'Fiil', isCorrect: false },
      ],
      solutionText: 'Varlık adı olduğu için isimdir (somut isim).',
    },
  ];
  return base;
}

// Görsel sorular — 10 tane, Wikimedia/Picsum üzerinden public resimlerle
function buildVisualQuestions(prefix: string): QuestionDef[] {
  return [
    {
      content: `${prefix} — Görseldeki geometrik şekil hangisidir?`,
      mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Regular_polygon_3_annotated.svg/240px-Regular_polygon_3_annotated.svg.png',
      options: [
        { content: 'Kare', isCorrect: false },
        { content: 'Üçgen', isCorrect: true },
        { content: 'Beşgen', isCorrect: false },
        { content: 'Daire', isCorrect: false },
      ],
      solutionText: 'Üç köşeli ve üç kenarlı şekil üçgendir.',
    },
    {
      content: `${prefix} — Resimde gösterilen kıta hangisidir?`,
      mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Europe_orthographic_Caucasus_Urals_boundary.svg/240px-Europe_orthographic_Caucasus_Urals_boundary.svg.png',
      options: [
        { content: 'Asya', isCorrect: false },
        { content: 'Afrika', isCorrect: false },
        { content: 'Avrupa', isCorrect: true },
        { content: 'Amerika', isCorrect: false },
      ],
      solutionText: 'Yeşil renkli alan Avrupa kıtasını gösterir.',
    },
    {
      content: `${prefix} — Görseldeki bayrak hangi ülkeye aittir?`,
      mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Flag_of_Turkey.svg/240px-Flag_of_Turkey.svg.png',
      options: [
        { content: 'Japonya', isCorrect: false },
        { content: 'Türkiye', isCorrect: true },
        { content: 'Tunus', isCorrect: false },
        { content: 'Azerbaycan', isCorrect: false },
      ],
      solutionText: 'Kırmızı zemin üzerinde ay-yıldız Türkiye bayrağıdır.',
    },
    {
      content: `${prefix} — Resimdeki gezegen hangisidir?`,
      mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Reprocessed_Mariner_10_image_of_Mercury.jpg/240px-Reprocessed_Mariner_10_image_of_Mercury.jpg',
      options: [
        { content: 'Mars', isCorrect: false },
        { content: 'Merkür', isCorrect: true },
        { content: 'Jüpiter', isCorrect: false },
        { content: 'Satürn', isCorrect: false },
      ],
      solutionText: 'Güneşe en yakın gezegen Merkür\'dür; gri-kraterli yüzeyiyle tanınır.',
    },
    {
      content: `${prefix} — Görseldeki çiçeğin Türkçe adı nedir?`,
      mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Red_sunflower.jpg/240px-Red_sunflower.jpg',
      options: [
        { content: 'Gül', isCorrect: false },
        { content: 'Ayçiçeği', isCorrect: true },
        { content: 'Lale', isCorrect: false },
        { content: 'Papatya', isCorrect: false },
      ],
      solutionText: 'Helianthus annuus — yüzünü güneşe dönen çiçek: ayçiçeği.',
    },
    {
      content: `${prefix} — Resimde gösterilen yapı hangi şehirdedir?`,
      mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/La_Tour_Eiffel_vue_de_la_Tour_Saint-Jacques%2C_Paris_ao%C3%BBt_2014_%282%29.jpg/240px-La_Tour_Eiffel_vue_de_la_Tour_Saint-Jacques%2C_Paris_ao%C3%BBt_2014_%282%29.jpg',
      options: [
        { content: 'Londra', isCorrect: false },
        { content: 'Roma', isCorrect: false },
        { content: 'Paris', isCorrect: true },
        { content: 'Berlin', isCorrect: false },
      ],
      solutionText: 'Eyfel Kulesi Fransa\'nın başkenti Paris\'tedir.',
    },
    {
      content: `${prefix} — Görseldeki hayvan hangi takıma aittir?`,
      mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cat03.jpg/240px-Cat03.jpg',
      options: [
        { content: 'Kuşlar', isCorrect: false },
        { content: 'Memeliler', isCorrect: true },
        { content: 'Sürüngenler', isCorrect: false },
        { content: 'Balıklar', isCorrect: false },
      ],
      solutionText: 'Kedi (Felis catus) bir memeli hayvandır.',
    },
    {
      content: `${prefix} — Resmedilen müzik aleti hangi gruba girer?`,
      mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Acoustic_guitar.png/240px-Acoustic_guitar.png',
      options: [
        { content: 'Vurmalı', isCorrect: false },
        { content: 'Üflemeli', isCorrect: false },
        { content: 'Telli', isCorrect: true },
        { content: 'Klavyeli', isCorrect: false },
      ],
      solutionText: 'Gitar telli çalgılar ailesindendir.',
    },
    {
      content: `${prefix} — Görseldeki grafiğe göre en yüksek değer hangi yılda?`,
      mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Bar_chart_example.svg/240px-Bar_chart_example.svg.png',
      options: [
        { content: '2018', isCorrect: false },
        { content: '2019', isCorrect: false },
        { content: '2020', isCorrect: true },
        { content: '2021', isCorrect: false },
      ],
      solutionText: 'Çubuk grafikte en uzun çubuk 2020 yılına aittir.',
    },
    {
      content: `${prefix} — Resimde gösterilen organ hangi sisteme aittir?`,
      mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Diagram_of_the_human_heart_%28cropped%29.svg/240px-Diagram_of_the_human_heart_%28cropped%29.svg.png',
      options: [
        { content: 'Sindirim sistemi', isCorrect: false },
        { content: 'Dolaşım sistemi', isCorrect: true },
        { content: 'Solunum sistemi', isCorrect: false },
        { content: 'Sinir sistemi', isCorrect: false },
      ],
      solutionText: 'Kalp dolaşım (kardiyovasküler) sisteminin temel organıdır.',
    },
  ];
}

const packageDefs: PackageDef[] = [
  {
    title: 'YKS-TYT Genel Tekrar Paketi',
    description: 'Üniversite hazırlık adayları için 2 testlik temel tekrar paketi.',
    priceCents: 4900,
    examTypeSlug: 'yks-tyt',
    tests: [
      { title: 'TYT Deneme — Bölüm 1', duration: 30, questions: buildGenericQuestions('TYT-1') },
      { title: 'TYT Deneme — Bölüm 2', duration: 30, questions: buildGenericQuestions('TYT-2') },
    ],
  },
  {
    title: 'YKS-AYT Sayısal Hazırlık',
    description: 'AYT sayısal alana hazırlananlar için yoğunlaştırılmış paket.',
    priceCents: 5900,
    examTypeSlug: 'yks-ayt-sayisal',
    tests: [
      { title: 'AYT Sayısal Deneme 1', duration: 35, questions: buildGenericQuestions('AYT-S-1') },
      { title: 'AYT Sayısal Deneme 2', duration: 35, questions: buildGenericQuestions('AYT-S-2') },
    ],
  },
  {
    title: 'KPSS Lisans Genel Yetenek',
    description: 'KPSS Lisans adayları için genel yetenek odaklı paket.',
    priceCents: 6900,
    examTypeSlug: 'kpss-lisans',
    tests: [
      { title: 'KPSS GY Deneme 1', duration: 40, questions: buildGenericQuestions('KPSS-L-1') },
      { title: 'KPSS GY Deneme 2', duration: 40, questions: buildGenericQuestions('KPSS-L-2') },
    ],
  },
  {
    title: 'KPSS Eğitim Bilimleri Hızlı Tarama',
    description: 'Öğretmen adayları için Eğitim Bilimleri hızlı tarama paketi.',
    priceCents: 5500,
    examTypeSlug: 'kpss-egitim-bilimleri',
    tests: [
      { title: 'EB Deneme 1', duration: 35, questions: buildGenericQuestions('KPSS-EB-1') },
      { title: 'EB Deneme 2', duration: 35, questions: buildGenericQuestions('KPSS-EB-2') },
    ],
  },
  {
    title: 'LGS Kapsamlı Çalışma — Görsel Destekli',
    description: 'LGS\'ye hazırlık için görsel destekli sorularla zenginleştirilmiş paket.',
    priceCents: 4500,
    examTypeSlug: 'lgs',
    tests: [
      {
        title: 'LGS Görsel Deneme (Resimli)',
        duration: 40,
        questions: buildVisualQuestions('LGS-Görsel'),
      },
      { title: 'LGS Klasik Deneme', duration: 40, questions: buildGenericQuestions('LGS-Klasik') },
    ],
  },
  {
    title: 'MSÜ Hazırlık Paketi',
    description: 'Milli Savunma Üniversitesi sınavına hazırlık denemeleri.',
    priceCents: 4900,
    examTypeSlug: 'msu',
    tests: [
      { title: 'MSÜ Deneme 1', duration: 30, questions: buildGenericQuestions('MSU-1') },
      { title: 'MSÜ Deneme 2', duration: 30, questions: buildGenericQuestions('MSU-2') },
    ],
  },
  {
    title: 'TUS Temel Bilimler Paketi',
    description: 'Tıpta Uzmanlık Sınavı temel bilimler hazırlık paketi.',
    priceCents: 9900,
    examTypeSlug: 'tus',
    tests: [
      { title: 'TUS Deneme 1', duration: 50, questions: buildGenericQuestions('TUS-1') },
      { title: 'TUS Deneme 2', duration: 50, questions: buildGenericQuestions('TUS-2') },
    ],
  },
  {
    title: 'YDS İngilizce Quick Practice',
    description: 'YDS sınavına hazırlananlar için pratik İngilizce paket.',
    priceCents: 5900,
    examTypeSlug: 'yds',
    tests: [
      { title: 'YDS Deneme 1', duration: 45, questions: buildGenericQuestions('YDS-1') },
      { title: 'YDS Deneme 2', duration: 45, questions: buildGenericQuestions('YDS-2') },
    ],
  },
  {
    title: 'KPSS ÖABT Genel Tekrar',
    description: 'Öğretmen adayları için ÖABT alan bilgisi tekrarı.',
    priceCents: 7900,
    examTypeSlug: 'kpss-oabt',
    tests: [
      { title: 'ÖABT Deneme 1', duration: 40, questions: buildGenericQuestions('OABT-1') },
      { title: 'ÖABT Deneme 2', duration: 40, questions: buildGenericQuestions('OABT-2') },
    ],
  },
  {
    title: 'YÖKDİL Akademik İngilizce',
    description: 'YÖKDİL sınavı için akademik İngilizce alıştırma paketi.',
    priceCents: 6500,
    examTypeSlug: 'yokdil',
    tests: [
      { title: 'YÖKDİL Deneme 1', duration: 45, questions: buildGenericQuestions('YOKDIL-1') },
      { title: 'YÖKDİL Deneme 2', duration: 45, questions: buildGenericQuestions('YOKDIL-2') },
    ],
  },
];

async function main() {
  const educator = await prisma.user.findUnique({
    where: { email: 'educator@demo.com' },
    select: { id: true, tenantId: true, username: true },
  });
  if (!educator) {
    throw new Error("educator@demo.com bulunamadı. Önce ana seed'i çalıştırın.");
  }

  const allExamTypes = await prisma.examType.findMany({ select: { id: true, slug: true } });
  const examTypeBySlug = new Map(allExamTypes.map((e) => [e.slug, e.id]));

  console.log(`Educator: ${educator.username} (${educator.id})`);
  console.log(`Tenant: ${educator.tenantId}`);
  console.log(`Toplam paket: ${packageDefs.length}\n`);

  let pkgCount = 0;
  let testCount = 0;
  let questionCount = 0;
  let optionCount = 0;

  for (const pkg of packageDefs) {
    const examTypeId = examTypeBySlug.get(pkg.examTypeSlug);
    if (!examTypeId) {
      console.warn(`! ExamType bulunamadı: ${pkg.examTypeSlug} — paket atlanıyor: ${pkg.title}`);
      continue;
    }

    const created = await prisma.testPackage.create({
      data: {
        tenantId: educator.tenantId,
        educatorId: educator.id,
        title: pkg.title,
        description: pkg.description,
        priceCents: pkg.priceCents,
        currency: 'TRY',
        difficulty: 'medium',
        isActive: true,
        publishedAt: new Date(),
      },
    });
    pkgCount++;

    for (const t of pkg.tests) {
      const test = await prisma.examTest.create({
        data: {
          tenantId: educator.tenantId,
          educatorId: educator.id,
          examTypeId,
          title: t.title,
          isTimed: true,
          duration: t.duration,
          durationSec: t.duration * 60,
          priceCents: pkg.priceCents,
          currency: 'TRY',
          questionCount: t.questions.length,
          hasSolutions: true,
          status: TestStatus.PUBLISHED,
          publishedAt: new Date(),
          packageId: created.id,
        },
      });
      testCount++;

      for (let i = 0; i < t.questions.length; i++) {
        const q = t.questions[i];
        const question = await prisma.examQuestion.create({
          data: {
            testId: test.id,
            content: q.content,
            mediaUrl: q.mediaUrl ?? null,
            order: i + 1,
            solutionText: q.solutionText ?? null,
            moderationStatus: 'APPROVED',
            moderatedAt: new Date(),
          },
        });
        questionCount++;

        for (const opt of q.options) {
          await prisma.examOption.create({
            data: {
              questionId: question.id,
              content: opt.content,
              mediaUrl: opt.mediaUrl ?? null,
              isCorrect: opt.isCorrect,
              moderationStatus: 'APPROVED',
              moderatedAt: new Date(),
            },
          });
          optionCount++;
        }
      }
    }
    console.log(`✓ ${pkg.title} — 2 test, ${pkg.tests[0].questions.length + pkg.tests[1].questions.length} soru`);
  }

  console.log(`\n=== Özet ===`);
  console.log(`Paket: ${pkgCount}`);
  console.log(`Test: ${testCount}`);
  console.log(`Soru: ${questionCount}`);
  console.log(`Seçenek: ${optionCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
