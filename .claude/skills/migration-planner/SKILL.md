---
name: migration-planner
description: Prisma şema değişikliklerini güvenli migration adımlarına dönüştürür — NOT NULL eklemek, kolon yeniden adlandırmak, tablo bölmek gibi tehlikeli değişiklikler için aşamalı plan çıkarır. Büyük şema değişikliği veya prod DB'ye migration uygulanacağında referans alın.
---

# Migration Planlama

Küçük bir `migrate dev` bile prod'da veri kaybı veya downtime'a yol açabilir. Bu skill, tehlikeli değişikliği birden fazla güvenli adıma böler.

## Temel İlke

**Expand → Migrate → Contract** (genişlet-taşı-daralt):

1. **Expand** — eski şema çalışırken yeni yapıyı EKLE (nullable, boş, parallel). Kod her iki tarafı bilsin.
2. **Migrate** — veriyi eski'den yeni'ye taşı (backfill). Kod yeni'ye yazmaya başla, eski'den de okusun.
3. **Contract** — eski yapıyı SİL. Kod artık sadece yeni'yi bilsin.

Her faz ayrı bir deploy. Arada uygulama hep çalışır.

## Senaryo: NOT NULL kolon ekle

**Hatalı (tek migration):**
```prisma
model Exam {
  category String  // NOT NULL, varsayılan yok
}
```
Mevcut satırlarda NULL olacağı için migration fail eder.

**Doğru (3 adım):**

**Adım 1 — Expand**
```prisma
model Exam {
  category String?  // önce nullable
}
```
Migration: `add_exam_category_nullable`. Deploy et.

**Adım 2 — Backfill**
```ts
// scripts/backfill-exam-category.ts
await prisma.exam.updateMany({
  where: { category: null },
  data: { category: 'UNCATEGORIZED' },
});
```
Çalıştır. Sonucu doğrula: `SELECT COUNT(*) FROM "Exam" WHERE category IS NULL` → 0.

**Adım 3 — Contract**
```prisma
model Exam {
  category String  // artık NOT NULL
}
```
Migration: `make_exam_category_required`. Deploy.

## Senaryo: Kolon yeniden adlandır

Prisma `@map` + iki adım:

**Adım 1** — yeni kolon ekle, eski de dursun:
```prisma
model Exam {
  name     String? @map("name")      // YENİ
  title    String  @map("title")     // ESKİ, hala kullanılıyor
}
```
Migration: `add_exam_name_column`.

**Adım 2** — backfill + kod hem yazmayı her ikisine yapsın:
```ts
// Application code: Exam yazarken hem title hem name'e yaz
// Background job: title'ı name'e kopyala
await prisma.$executeRaw`UPDATE "Exam" SET name = title WHERE name IS NULL`;
```

**Adım 3** — kod okumayı name'den yapsın, title'ı yalnız yazma olarak bırak (gerekirse geri dön imkanı).

**Adım 4** — title'ı kaldır:
```prisma
model Exam {
  name  String
}
```
Migration: `drop_exam_title`.

## Senaryo: Tablo böl

Örn. `User.profileBio` alanını `Profile` tablosuna taşı.

- **Expand**: Profile tablosu yarat, User.profileBio hala var.
- **Backfill**: User satırlarını iter et, Profile kaydı oluştur.
- **Dual-write**: Kod hem eskiye hem yeniye yazsın, okumayı yeniden yap.
- **Contract**: User.profileBio kaldır.

## Senaryo: Index ekle / kaldır

**Ekle** — büyük tabloda:
```prisma
@@index([publishedAt])
```
Prisma default olarak online index oluşturur (PostgreSQL `CREATE INDEX CONCURRENTLY` için raw SQL gerekir):

```sql
-- migrations/add_exam_published_at_idx/migration.sql
CREATE INDEX CONCURRENTLY "Exam_publishedAt_idx" ON "Exam" ("publishedAt");
```
`CONCURRENTLY` lock'lamadan ekler, uzun sürer ama üretim güvenli.

**Kaldır** — önce query plan'da kullanılıp kullanılmadığını doğrula:
```sql
EXPLAIN ANALYZE SELECT ... WHERE ...;
```
Kullanılmıyorsa `DROP INDEX` güvenli. Kullanılıyorsa kaldırma — regresyon yaratır.

## Production Migration Akışı

1. **Staging'de deneme** — prod verisi kopyasıyla (anonimleştirilmiş).
2. **Backup al** — migration öncesi snapshot.
3. **Trafiği azalt** — gerekirse bakım modu (kısa migration için gerek yok).
4. **Migrate deploy**:
   ```bash
   npx prisma migrate deploy
   ```
5. **Doğrula** — sağlık endpoint'i, kritik query'ler.
6. **Rollback planı hazır** — geri dönmek gerekirse ne yapılacak, komutu yazılı.

## Kaçınılacaklar

- **`prisma migrate reset` prod'da** — tüm veri gider. Sadece geliştirme.
- **DROP TABLE / DROP COLUMN tek adımda büyük tabloda** — downtime üretir, önce trafik kes.
- **Application + schema değişikliğini aynı deploy'a koymak** — migration sırasında uygulama eski şemayla çalışacak, fail eder. Ayrı deploy.
- **Foreign key ekleme büyük tabloda** — scan yapar, kilit alır. Off-hours planla.

## Checklist (her migration için)

- [ ] Migration adı imperatif ve açık mı?
- [ ] Prod'da veri kaybı riski var mı?
- [ ] Backward compatible mı (eski kod da çalışır mı)?
- [ ] Rollback mümkün mü, planı yazılı mı?
- [ ] Staging'de denendi mi?
- [ ] Backfill script'i idempotent mi (iki kez koşunca zarar vermez mi)?

## Raporlama

Bir migration planı isteniyorsa şu formatta yaz:

```
DEĞİŞİKLİK: <özet>
RİSK: düşük/orta/yüksek — neden
ADIMLAR:
  1. <ne> — deploy gerekli mi?
  2. ...
ROLLBACK: <adım adım geri dönüş>
TAHMİNİ SÜRE: <migration süresi prod'da>
```
