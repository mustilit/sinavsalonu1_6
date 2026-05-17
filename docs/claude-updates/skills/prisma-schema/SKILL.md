---
name: prisma-schema
description: Prisma şema yazım kuralları, migration akışı, indeks stratejisi (composite + cursor), select discipline, seed pattern'i. Şemaya model eklenirken, query yazılırken veya migration üretilirken referans alın.
---

# Prisma Şema ve Migration

## Model Yazım Kuralları

```prisma
model ExamTest {
  id              String      @id @default(uuid())
  title           String
  description     String?
  priceCents      Int
  durationMinutes Int
  educatorId      String?
  educator        User?       @relation("educatorTests", fields: [educatorId], references: [id], onDelete: SetNull)
  questions       ExamQuestion[]
  purchases       Purchase[]
  attempts        TestAttempt[]
  status          TestStatus  @default(DRAFT)
  publishedAt     DateTime?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  deletedAt       DateTime?

  @@index([educatorId])
  @@index([publishedAt])
}
```

Kurallar:
- **PK:** `String @id @default(uuid())` (mevcut konvansiyon) veya `cuid()`. Tutarlı kal.
- **Para:** `Int` ile **cents** sakla (`priceCents`). Float / Decimal yerine bütüncül kullanım — projede zaten `priceCents`, `amountCents` standart.
- **Timestamps:** `createdAt @default(now())` + `updatedAt @updatedAt` her modelde.
- **Relation adı:** `@relation("name")` ilişkinin rolü belirsizse (bir user'ın hem eğittiği hem çözdüğü test gibi).
- **Enum:** `UserRole`, `TestStatus`, `PurchaseStatus` gibi — stringler yerine.
- **Cascade:** Child'ı silme davranışı düşün — ödeme/satın alma kayıtlarında `Cascade` kullanma, `SetNull` veya soft delete tercih et.

## Domain Terminolojisi (önemli)

- **EDUCATOR** rolü kullan, `AUTHOR` değil. Proje sözlüğü değişti.
- **Test** = `ExamTest`. "Exam" tek başına model değil; `ExamType` ayrı (sınav türü meta).
- **Aday** = `User` with `role: CANDIDATE`.

## Enum

```prisma
enum UserRole {
  ADMIN
  EDUCATOR
  CANDIDATE
  WORKER
}

enum TestStatus {
  DRAFT
  PUBLISHED
  UNPUBLISHED
}

enum AttemptStatus {
  IN_PROGRESS
  SUBMITTED
  TIMEOUT
}
```

## Migration

```bash
# geliştirme
cd apps/backend
npm run db:migrate -- --name <short_imperative_name>

# CI / prod
npx prisma migrate deploy
```

Migration adı kuralı: `add_exam_search_vector`, `rename_user_role`, `split_question_choices`. Geçmiş zaman değil, imperatif.

**Tehlikeli değişiklik kontrol listesi (migration yazmadan önce):**
- NOT NULL kolon ekleniyor → önce nullable + backfill + sonra NOT NULL.
- Tür değişimi → veri kaybı riski, backup al.
- İsim değişimi → iki adımlı: yeni kolon ekle, kopyala, eski sil.
- Index kaldırma → performans regresyonu, prod'da monitor et.
- Büyük tabloda index ekleme → `CREATE INDEX CONCURRENTLY` (lock almasın).

Detay: `migration-planner` skill'i.

## Seed

```ts
// prisma/seed.ts
import { PrismaClient, UserRole } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: { name: 'Default', slug: 'default' },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@sinavsalonu.local' },
    update: {},
    create: {
      email: 'admin@sinavsalonu.local',
      username: 'admin',
      passwordHash: await hash('admin'),
      role: UserRole.ADMIN,
      tenantId: tenant.id,
    },
  });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

`package.json`:
```json
"prisma": { "seed": "tsx prisma/seed.ts" }
```

Çalıştır: `npx prisma db seed`.

## Query Kuralları

### Select Discipline — Liste Endpoint'leri

Listeleme query'lerinde `select` ile **sadece UI'ın gösterdiği alanları** çek. `findMany()` default tüm kolonları getirir; payload + DB IO katlanır.

```ts
// KÖTÜ — tüm alanlar
const tests = await prisma.examTest.findMany({
  where: { status: 'PUBLISHED' },
  include: { educator: true, questions: true },  // questions liste için gereksiz
});

// İYİ — ihtiyaç kadar
const tests = await prisma.examTest.findMany({
  where: { status: 'PUBLISHED' },
  select: {
    id: true,
    title: true,
    priceCents: true,
    campaignPriceCents: true,
    publishedAt: true,
    educator: { select: { id: true, username: true } },
    examType: { select: { id: true, name: true } },
  },
});
```

**Kural:** Her liste endpoint'i için "Card UI'ında hangi alanlar görünüyor?" sorusunu yanıtla. Select onunla birebir eşleşsin. Detay endpoint'i ayrı — `getById` farklı select kullanır.

**Yeniden kullanılabilir select tipi:**

```ts
import { Prisma } from '@prisma/client';

export const examCardSelect = {
  id: true,
  title: true,
  priceCents: true,
  publishedAt: true,
  educator: { select: { id: true, username: true } },
} satisfies Prisma.ExamTestSelect;

export type ExamCard = Prisma.ExamTestGetPayload<{ select: typeof examCardSelect }>;
```

`satisfies` ile select shape tipini Prisma'dan üretip frontend response tipi olarak kullanabilirsin.

### N+1 Tehlikesi

Loop içinde `findUnique` yerine `findMany({ where: { id: { in: [...] } } })`:

```ts
// KÖTÜ
for (const testId of ids) {
  const test = await prisma.examTest.findUnique({ where: { id: testId } });
}

// İYİ
const tests = await prisma.examTest.findMany({
  where: { id: { in: ids } },
  select: examCardSelect,
});
const byId = new Map(tests.map(t => [t.id, t]));
```

### Pagination

Büyüyebilecek listeler için `cursor` + `take` kullan, `skip` ile offset değil. Detay: `pagination` skill'i.

```ts
prisma.examTest.findMany({
  cursor: cursor ? { id: cursor.id } : undefined,
  skip: cursor ? 1 : 0,
  take: 21,                          // +1 hasMore kontrolü
  orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
  select: examCardSelect,
});
```

### Transaction

Birden fazla yazma varsa **her zaman** `prisma.$transaction(async tx => ...)`:

```ts
return prisma.$transaction(async (tx) => {
  const purchase = await tx.purchase.create({ data: { ... } });
  await tx.testStats.update({ where: { testId }, data: { purchaseCount: { increment: 1 } } });
  return purchase;
});
```

### Raw SQL

Prisma ifade edemiyorsa `prisma.$queryRaw` — **mutlaka parametreli**:

```ts
// İYİ — template literal'da ${} → parameter binding
await prisma.$queryRaw`SELECT * FROM exam_tests WHERE search_vector @@ to_tsquery('simple', ${tsquery})`;

// KÖTÜ — string concat → SQL injection
await prisma.$queryRawUnsafe(`SELECT * FROM exam_tests WHERE title ILIKE '%${userInput}%'`);
```

Full-text search için: `full-text-search` skill'i.

## Composite Indexes — Yeni Query Pattern'i

Her yeni endpoint veya rapor sorgusu yazılırken **mutlaka** sorgunun WHERE + ORDER BY kolonlarına göre index var mı kontrol et. PostgreSQL composite index'i sol-baştan eşitlik kolonları → range kolonları → sort kolonları sırasında kullanır.

### Sıralama: equality → range → order → tie-breaker

```prisma
// Sorgu: status='PUBLISHED' AND examTypeId=? ORDER BY publishedAt DESC, id DESC
@@index([status, examTypeId, publishedAt(sort: Desc), id(sort: Desc)])
```

Doğru sıra:
1. Equality (eşitlik filtresi): `status`, `examTypeId`
2. Range veya sort: `publishedAt DESC`
3. Tie-breaker (cursor pagination için): `id DESC`

### Karar Akışı

Yeni endpoint için query yazdıysan:

1. Staging'de `EXPLAIN ANALYZE` koştur. `Seq Scan` görüyorsan index yok.
2. WHERE'deki eşitlik kolonları + ORDER BY'daki kolonları sıralı listele.
3. Mevcut `@@index`'lerden biri bu sırayla başlıyor mu? Başlıyorsa yeni index gerekmez.
4. Başlamıyorsa yeni `@@index` ekle. Adı zorunlu değil — Prisma otomatik üretir.

### Sınav Salonu'nda Eksik Olabilecek Composite'ler

Mevcut `@@index([tenantId])`, `@@index([educatorId])` gibi tek kolonlu index'ler var. Listeleme query'leri büyüdükçe şu desenler için composite gerekir:

```prisma
// Marketplace listesi: tenantId + status filtresi + publishedAt sort
@@index([tenantId, status, publishedAt(sort: Desc), id(sort: Desc)])

// Eğiticinin satışları: educatorId + tarih aralığı sort
@@index([tenantId, educatorId, createdAt(sort: Desc)])

// Aday cevapları: testId + tamamlanma durumu
@@index([testId, status, completedAt(sort: Desc)])
```

Ne zaman eklenir: ölçüm yapılınca. Boş tabloda EXPLAIN anlamlı sonuç vermez — staging'e production benzeri veri yükle.

### Yeni Index Eklemenin Maliyeti

- Yazma performansı: her INSERT/UPDATE/DELETE bu index'i de günceller. Yüksek yazma hızı olan tablolarda dikkat.
- Disk: index = ekstra alan, büyük tabloda GB seviyesinde olabilir.
- Migration süresi: büyük tabloda `CREATE INDEX` lock'lar. Prod için `CONCURRENTLY` zorunlu.

### Index Var ama Kullanılmıyor

PostgreSQL planner kararı verir. İndex var ama scan yapıyorsa:
- Tablo çok küçük (Seq Scan zaten hızlı, planner doğru).
- Statistics güncel değil: `ANALYZE table_name;`
- Sıralama tutarsız: index `DESC`, cursor sort `ASC` → kullanılmaz.

## Relation Pattern'leri

**One-to-many:** User → ExamTest (educator)
```prisma
model User {
  examTests ExamTest[] @relation("educatorTests")
}
model ExamTest {
  educatorId String?
  educator   User?    @relation("educatorTests", fields: [educatorId], references: [id], onDelete: SetNull)
}
```

**Many-to-many (explicit):** User ↔ ExamTest üzerinden Purchase
```prisma
model Purchase {
  candidateId String
  testId      String
  candidate   User     @relation("userPurchases", fields: [candidateId], references: [id])
  test        ExamTest @relation(fields: [testId], references: [id])
  // ...

  @@unique([testId, candidateId])
}
```

## Soft Delete

Sınav Salonu'nda mevcut: `User.deletedAt`, `ExamTest.deletedAt`, `Purchase.deletedAt`. Repository katmanında `where: { deletedAt: null }` ekle. Prisma middleware ile global da yapılabilir; explicit daha okunabilir.

## Full-Text Search

`title ILIKE '%foo%'` 100k satıra çıkınca yavaşlar (sequential scan). PostgreSQL `tsvector` + GIN index ile arama log(n) olur. Detay: `full-text-search` skill'i.

## Multi-tenant Reminder

`tenantId` field'ı `User`, `ExamTest`, `Purchase`, `TestPackage`, `AdPurchase`, `Subscription` modellerinde zorunlu. Yeni model eklerken:
- Tenant ilişkisi mantıksal mı? Evetse `tenantId` + `@@index([tenantId])` ekle.
- Repository'de query'ler tenantId ile filtrelensin. `tenant.middleware.ts` request scope'unda set ediyor.

## Yapmayacakların

- **Float ile para** — daima `Int` cents.
- **`include` ile tüm alanlar** — `select` ile shape'i belirle.
- **`skip + take` offset pagination** — büyük listede yavaş, cursor kullan.
- **Loop'ta `findUnique`** — `findMany({ where: { id: { in } } })`.
- **`prisma.$queryRawUnsafe`** — daima parametreli `$queryRaw`.
- **`prisma migrate reset` prod'da** — tüm veri gider.
- **NOT NULL kolon tek adımda** — expand-migrate-contract; `migration-planner` skill'i.

## Checklist (her şema değişikliği)

- [ ] Model adı domain sözlüğüne uygun mu? (EDUCATOR/CANDIDATE/ADMIN, ExamTest)
- [ ] Para alanları `Int @map("...")` cents mi?
- [ ] `createdAt`, `updatedAt` var mı?
- [ ] Multi-tenant ise `tenantId` + index?
- [ ] Soft delete gerekiyor mu? `deletedAt DateTime?`?
- [ ] WHERE + ORDER BY'a göre composite index var mı?
- [ ] Migration adı imperatif + kısa mı?
- [ ] Tehlikeli değişiklik varsa expand-migrate-contract planı?

Skill'ler: `pagination` (cursor + index ilişkisi), `full-text-search` (tsvector), `migration-planner` (online index ekleme, expand-contract).
