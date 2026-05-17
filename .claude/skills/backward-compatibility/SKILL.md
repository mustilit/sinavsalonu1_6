---
name: backward-compatibility
description: Yeni özellik eklerken eski yapıyı bozmama disiplini. Pre-flight kontrol, "kim kullanıyor" haritası, additive değişiklik, schema/API/component evrim kuralları. Yeni feature, schema değişikliği, refactor veya rename öncesi referans alın.
---

# Backward Compatibility — Eskiyi Kırma

## Temel İlke

**"Eklemek" güvenli, "değiştirmek" tehlikeli, "silmek" felaket.** Her değişiklikten önce sor: bu kod/alan/endpoint kullanımda mı? Kim kullanıyor? Eski hali da çalışsa ne kaybederiz?

## Pre-flight Checklist (her değişiklikten önce)

Yeni özellik/refactor öncesi şu sorulara YANIT VER:

1. **Ne değişiyor?** Tek cümle.
2. **Bu kim kullanıyor?** Grep ile bul. Sıfır kullanım = güvenli sil. Aksi halde dikkatli.
3. **Yıkıcı mı, eklemeli mi?**
   - Eklemeli: yeni alan/endpoint/component → eski tüketiciler etkilenmez
   - Yıkıcı: alan adı değişti, tip daraldı, endpoint kaldırıldı, component prop'u zorunlu oldu
4. **Yıkıcıysa: aşamalı plan var mı?** (Expand → Migrate → Contract — bkz. migration-planner)
5. **Test'ler hala geçer mi?** Mevcut test'leri çalıştır, yeni değişiklikten **önce**.
6. **Public API mi, internal mi?** External consumer varsa contract evolution gerekir; internal ise daha esnek.

## Değişiklik Türleri

### Eklemeli (Safe)
- Yeni endpoint
- Yeni component
- Yeni column (nullable veya default'lu)
- Yeni optional prop
- Yeni opsiyonel DTO alanı
- Yeni enum değeri (frontend exhaustive switch'i kontrol et)

### Yıkıcı (Risky)
- Endpoint silmek
- Endpoint method/path değiştirmek
- Column silmek veya tip değiştirmek
- Required prop ekle
- DTO alanını zorunlu yap
- Enum değeri silmek
- Component'in dönüş tipini değiştirmek

## "Kim Kullanıyor" Haritası

Değişiklikten önce **mutlaka** grep:

```bash
# Backend method'u kim çağırıyor?
git grep "examService.create"

# Component nerede kullanılıyor?
git grep "<ExamCard"

# DTO alanı?
git grep "examData.title"

# Endpoint?
git grep "/api/exams"
```

Sonuç:
- **0 hit:** rahat değiştir
- **1-3 hit:** elle güncellemekten kolay yok, hepsini değiştir
- **3+ hit:** aşamalı git (deprecate önce, sonra sil)

## Schema Evrimi

Bkz. `migration-planner` skill — Expand/Migrate/Contract pattern.

Hızlı kurallar:
- **NOT NULL ekleme** → önce nullable, backfill, sonra not null
- **Kolon yeniden adlandır** → yeni kolon ekle, dual-write, eskiyi sil
- **Tablo böl** → expand + backfill + cut over
- **Cascade delete** → düşün! Eski kayıtların kaybolmasına neden olabilir
- **Unique constraint ekleme** → önce duplicate'leri temizle (script), sonra constraint

## API Contract Evrimi

**Eklemeli alan:**
```ts
// Eski
interface CreateExamRequest {
  title: string;
  price: number;
}

// Yeni — alanı opsiyonel ekle
interface CreateExamRequest {
  title: string;
  price: number;
  category?: string;  // ← yeni, opsiyonel
}
```
Eski client'lar etkilenmez.

**Yıkıcı değişim:**
```ts
// Eski
interface ExamResponse {
  id: string;
  title: string;
  price: number;  // ← number
}

// Yeni — tip değişti
interface ExamResponse {
  id: string;
  title: string;
  price: { amount: number; currency: string };  // ← object
}
```
Bu yıkıcı. Çözüm:
1. Yeni alan ekle: `priceObj: { amount, currency }` (opsiyonel)
2. Frontend'i `priceObj`'i okumaya geçir
3. Eski `price`'ı kaldır (sonraki sürümde)

İç API'de daha cesur olabilirsin — frontend ve backend aynı repo'daysa atomic değişiklik mümkün, ama yine de aşamalı git.

## Component Evrimi

**Eklemeli prop:**
```tsx
// Eski
type Props = { exam: Exam };

// Yeni
type Props = {
  exam: Exam;
  variant?: 'default' | 'compact';  // ← opsiyonel
};
```

**Yıkıcı: prop zorunlu yapma**
```tsx
// Eski — onPurchase optional
type Props = { exam: Exam; onPurchase?: () => void };

// Yeni — zorunlu yapmak yıkıcı
type Props = { exam: Exam; onPurchase: () => void };
```
Tüm kullanım yerlerini güncelle, sonra zorunlu yap.

**Component dönüş yapısı:** JSX yapısı değiştiğinde test'leri kır:
```tsx
// Eski — sadece title gösteriyor
return <h2>{title}</h2>;

// Yeni — wrapper eklendi
return <div className="card"><h2>{title}</h2></div>;
```
Test'te `getByRole('heading')` aynı çalışsa da, parent layout CSS'i kırılabilir. Storybook + visual diff faydalı.

## Refactor Stratejisi

### "Tek seferde temizle"
Küçük scope (5-10 dosya), test kapsamı iyi → tek PR.

### "Strangler fig" pattern
Büyük refactor (50+ dosya, kritik kod):
1. Yeni implementasyonu **eskiyi etkilemeden** ekle
2. Yeni callsite'lar yenisini kullansın
3. Eski callsite'ları kademeli olarak migrate et
4. Hepsi geçince eski'yi sil

Eski + yeni paralel çalışırken test edilir, geri alınabilir.

## Feature Flag (Basit)

External servis gerekmez:

```js
// apps/frontend/src/lib/features.js
export const features = {
  newCheckoutFlow: import.meta.env.VITE_FEATURE_CHECKOUT_V2 === 'true',
  examCategories: import.meta.env.VITE_FEATURE_CATEGORIES === 'true',
};
```

```jsx
{features.newCheckoutFlow ? <CheckoutV2 /> : <CheckoutV1 />}
```

Yeni kod entegre, eski kod hala çalışıyor. Flag açık/kapalı arasında geçiş kolay. Test'te de iki yolu da test et.

İleride büyürse PostHog veya GrowthBook'a geç.

## Kritik Tablo: "Şunu Yaparken Şunu Düşün"

| Yapıyorsan | Risk | Önlem |
|------------|------|-------|
| Endpoint kaldırma | Frontend kırılır | Önce frontend'i değiştir, deploy et, sonra backend'i |
| DTO alanı silme | Frontend gönderiyorsa 400 | Önce backend `whitelist:true` ile yutsun, frontend güncelle, sonra şemadan sil |
| DB kolonu silme | App eskisi kullanırken çakılır | Önce app'i koddan sil, deploy, sonra migration |
| Component prop renaming | Tüm kullanımlar kırılır | grep + replace + lint, hepsi tek PR |
| Service method signature değişimi | Caller'lar kırılır | Yeni method ekle, eskileri kademeli migrate et |
| Enum değer silme | Switch'lerde unhandled case | Sil + tüm exhaustive switch'leri güncelle |

## "Eski Çalışıyordu Şimdi Çalışmıyor" Tanı

Yeni özellik ekledim, eski çalışmıyor → şu sırayla bak:

1. **Hangi commit kırdı?** `git bisect` veya son 5 commit'i incele.
2. **Ne değişti?** `git diff <last-working>..HEAD` → değişen dosyalar.
3. **Hangi davranışı etkiledi?** Test çalıştır — hangi test fail oluyor?
4. **Geri alma maliyeti?** Yeni feature kalsın diye kırılıyı tolere etmeyelim — ya düzelt ya geri al, asla "şimdilik bozuk" deme.

## Test Korunuyor mu?

Yeni feature eklerken **mevcut test'leri çalıştır**. Mevcut test fail ise:

- Test güncellenmesi mi gerekiyor (yeni doğru davranış var)?
- Yoksa kod yanlış değişti mi?

Test'i değiştirmek **kolay yoldan** kötü çözüm. "Önce davranışı kabul et, sonra test'i ona uydur" tehlikeli — bug'ı kabul ediyorsun.

## Checklist (her yeni feature/refactor için)

- [ ] Pre-flight: ne değişiyor, kim kullanıyor, yıkıcı mı?
- [ ] Eklemeli yapılabilir mi (zorlukla bile)?
- [ ] Yıkıcıysa aşamalı plan yazıldı mı?
- [ ] Mevcut test'ler hala geçiyor mu?
- [ ] Yeni davranış için test eklendi mi?
- [ ] Tüm kullanım yerleri güncellendi mi (grep doğrulandı)?
- [ ] Frontend ve backend aynı PR'da mı, ayrı deploy gerekirse sıra ne?
- [ ] Geri alma planı var mı?

## Kırmızı Çizgiler

- **Production'da çalışan endpoint'i bir gecede kaldırma** — deprecate header'ı, log warning, 1-2 sürüm sonra kaldır.
- **Migration'ı uygulama deploy'undan sonra at** — uygulama eski şemayla restart olabilir, kırılır.
- **"Hızlıca düzeltirim" diyerek shared component'i değiştirme** — 10 yerde kullanılıyor olabilir.
- **Test'i devre dışı bırakarak yeni özellik geçirme** — bug'ı kabul ediyorsun.
