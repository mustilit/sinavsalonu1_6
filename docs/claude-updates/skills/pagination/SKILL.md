---
name: pagination
description: Liste endpoint'leri için cursor-based pagination pattern'i — Prisma cursor/take kullanımı, backend DTO, frontend dalClient + TanStack Query useInfiniteQuery entegrasyonu. Marketplace, Explore, MyTests, ManageUsers gibi büyüyebilecek listeler için referans alın.
---

# Cursor-Based Pagination

Sınav Salonu marketplace büyüdükçe `offset/limit` (OFFSET 1000 LIMIT 20) yavaşlar — PostgreSQL kayıtları sayıp atmak zorunda. Cursor pagination her sayfayı O(log n) ile getirir; sayfa numarası yerine "son gördüğüm kaydın id'si"nden devam eder.

## Ne Zaman Cursor, Ne Zaman Offset

| Durum | Pagination |
|-------|------------|
| Liste sıralı (createdAt DESC, id), sonsuz scroll | **Cursor** |
| Yönetici "sayfa 47'ye git" diyebilir, atlamalı | Offset (toplam sayfa belli) |
| Liste 1000 kayıttan küçük kalacak | Önemi yok |
| Yüksek trafik, performans kritik | **Cursor** |

Sınav Salonu için **varsayılan cursor**. Admin raporlarında offset kabul edilebilir; satın alma akışında değil.

## Sıralama Anahtarı Seçimi

Cursor için kullanılacak alan **stabil + unique** olmalı. En sık kombinasyon: `(createdAt DESC, id DESC)` — aynı milisaniyede iki kayıt için id tie-breaker.

```prisma
model ExamTest {
  // ...
  @@index([publishedAt(sort: Desc), id(sort: Desc)])  // cursor için composite index
}
```

Sıralama alanı index'sizse cursor da yavaş olur — composite index disiplini için `prisma-schema` skill'i.

## Backend — Prisma Cursor

```ts
// application/use-cases/ListMarketplaceTestsUseCase.ts
type Params = {
  cursor?: { publishedAt: Date; id: string };
  limit?: number;            // varsayılan 20, max 100
  filter?: { examTypeId?: string; topicId?: string };
};

export class ListMarketplaceTestsUseCase {
  async execute({ cursor, limit = 20, filter }: Params) {
    const take = Math.min(Math.max(limit, 1), 100) + 1; // +1: hasMore kontrolü için

    const rows = await prisma.examTest.findMany({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
        ...(filter?.examTypeId && { examTypeId: filter.examTypeId }),
        ...(filter?.topicId && { topicId: filter.topicId }),
      },
      // SADECE liste için gerekli alanlar — select discipline (prisma-schema skill)
      select: {
        id: true,
        title: true,
        priceCents: true,
        campaignPriceCents: true,
        publishedAt: true,
        educator: { select: { id: true, username: true } },
        examType: { select: { id: true, name: true } },
      },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take,
      // İlk sayfa için cursor yok
      ...(cursor && {
        cursor: { id: cursor.id },
        skip: 1, // cursor'un kendisini atla
      }),
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, -1) : rows;
    const last = items[items.length - 1];

    return {
      items,
      nextCursor: hasMore && last
        ? { publishedAt: last.publishedAt!.toISOString(), id: last.id }
        : null,
    };
  }
}
```

**Önemli notlar:**
- `take + 1`: bir fazla çekip "daha var mı"yı tek query'de cevapla.
- `cursor + skip: 1`: Prisma'da cursor inclusive; sonraki sayfa için skip:1 zorunlu.
- `cursor` alanı **unique** olmalı — Prisma `where unique`'a ihtiyaç duyar. `id` her zaman güvenli.
- Sıralama (`orderBy`) ile cursor anahtarı uyumlu olmalı. `id desc` cursor + `createdAt asc` orderBy → sonuçlar tutarsız.

## DTO

```ts
// nest/controllers/dto/list-marketplace-tests.dto.ts
import { IsOptional, IsInt, Min, Max, IsString, IsISO8601 } from 'class-validator';
import { Type } from 'class-transformer';

export class ListMarketplaceTestsQueryDto {
  @IsOptional() @IsString()
  cursorId?: string;

  @IsOptional() @IsISO8601()
  cursorPublishedAt?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;

  @IsOptional() @IsString()
  examTypeId?: string;

  @IsOptional() @IsString()
  topicId?: string;
}
```

Cursor'u iki ayrı query param olarak taşıyoruz. Opaque base64 cursor da geçerli:

```ts
function encodeCursor(c: { publishedAt: string; id: string }) {
  return Buffer.from(JSON.stringify(c)).toString('base64url');
}
function decodeCursor(s: string) {
  return JSON.parse(Buffer.from(s, 'base64url').toString('utf8'));
}
```

Opaque cursor frontend'e implementation detail göstermez; karşılığı: encode/decode + validation.

## Controller

```ts
@Public()
@Get('marketplace/tests')
async list(@Query() q: ListMarketplaceTestsQueryDto) {
  const cursor = q.cursorId && q.cursorPublishedAt
    ? { id: q.cursorId, publishedAt: new Date(q.cursorPublishedAt) }
    : undefined;
  return this.listMarketplaceTestsUC.execute({
    cursor,
    limit: q.limit,
    filter: { examTypeId: q.examTypeId, topicId: q.topicId },
  });
}
```

## Response Shape

```json
{
  "items": [
    { "id": "...", "title": "...", "priceCents": 4900, "publishedAt": "2026-05-10T08:30:00Z", "educator": { "id": "...", "username": "..." } }
  ],
  "nextCursor": {
    "publishedAt": "2026-05-09T22:11:00Z",
    "id": "cuid_xyz"
  }
}
```

`nextCursor === null` → liste bitti.

## Frontend — dalClient

```js
// apps/frontend/src/api/dalClient.js
marketplace: {
  listTests: ({ cursor, limit = 20, examTypeId, topicId } = {}) => {
    const qs = new URLSearchParams();
    if (cursor?.id) qs.set('cursorId', cursor.id);
    if (cursor?.publishedAt) qs.set('cursorPublishedAt', cursor.publishedAt);
    if (limit) qs.set('limit', String(limit));
    if (examTypeId) qs.set('examTypeId', examTypeId);
    if (topicId) qs.set('topicId', topicId);
    return request(`/marketplace/tests?${qs.toString()}`);
  },
},
```

## Frontend — useInfiniteQuery

```jsx
import { useInfiniteQuery } from '@tanstack/react-query';
import { dalClient } from '@/api/dalClient';

export function MarketplaceList({ filter }) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['marketplace', 'tests', filter],
    queryFn: ({ pageParam }) =>
      dalClient.marketplace.listTests({ cursor: pageParam, ...filter }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 60_000,
  });

  if (isLoading) return <ListSkeleton />;
  if (isError) return <ErrorState />;

  const items = data.pages.flatMap((p) => p.items);

  return (
    <div className="space-y-4">
      {items.map((t) => <TestCard key={t.id} test={t} />)}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-full py-2 border rounded"
        >
          {isFetchingNextPage ? 'Yükleniyor…' : 'Daha fazla göster'}
        </button>
      )}
    </div>
  );
}
```

**Intersection observer ile sonsuz scroll (opsiyonel):**

```jsx
const sentinelRef = useRef(null);
useEffect(() => {
  if (!sentinelRef.current || !hasNextPage) return;
  const io = new IntersectionObserver(
    (entries) => entries[0].isIntersecting && fetchNextPage(),
    { rootMargin: '200px' },
  );
  io.observe(sentinelRef.current);
  return () => io.disconnect();
}, [hasNextPage, fetchNextPage]);

return (
  <>
    {items.map(/* ... */)}
    {hasNextPage && <div ref={sentinelRef} className="h-1" />}
    {isFetchingNextPage && <Spinner />}
  </>
);
```

## Migration — Offset'ten Cursor'a Geçiş

Mevcut offset endpoint'ler kırılmasın:

**Faz 1**: Yeni endpoint aynı path'te ek query param olarak cursor'u kabul etsin. `page=1` gönderilirse eski davranış, `cursorId` gönderilirse yeni.

**Faz 2**: Frontend `useInfiniteQuery`'ye geçtikçe eski path'i çağıran kalmaz.

**Faz 3**: `git grep "page=" apps/frontend` ile kullanım sıfırsa, `page/offset` parametre desteği kaldırılır.

## Composite Index Bağlantısı

Cursor pagination'ın hızı **sıralama alanlarının index'lenmesine** bağlıdır. Şu desende sorgu yapıyorsan:

```ts
where: { status: 'PUBLISHED', examTypeId: 'X' },
orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
```

Composite index gerekli:
```prisma
@@index([status, examTypeId, publishedAt(sort: Desc), id(sort: Desc)])
```

Sıra (eşitlik kolonları → range kolonları → tie-breaker) doğru olduğunda PostgreSQL index'i tam kullanır. Detay: `prisma-schema` skill'i, **Composite Indexes** bölümü.

## Yapmayacakların

- **`skip` + `take`** ile offset pagination yazma — büyüyecek listede yavaştır.
- **`page` query parametresi** — frontend cursor mantığı için ekstra hesap gerektirir.
- **`include` ile derin nested fetch** — liste endpoint'inde tek seviye `select`, gerek olmayan alan yok.
- **Cursor olarak `createdAt` tek başına** — aynı milisaniyede tie olur, kayıt atlanır/tekrarlanır. Daima `id` tie-breaker.
- **`COUNT(*)` her sayfada** — büyük tabloda yavaştır. Toplam sayı gerçekten gerekli değilse hesaplama.

## Checklist (her yeni liste endpoint'i)

- [ ] Sıralama anahtarı `(zaman/skor desc, id desc)` ile unique mi?
- [ ] Composite index `where` filtreleri + orderBy kolonlarını kapsıyor mu?
- [ ] `limit` üst sınırı (max 100) zorlanıyor mu?
- [ ] `take + 1` ile hasMore tek query'de mi alınıyor?
- [ ] `select` ile sadece UI'ın gösterdiği alanlar mı çekiliyor?
- [ ] DTO + class-validator parametreleri tanımlı mı?
- [ ] dalClient'a method eklendi mi?
- [ ] Frontend `useInfiniteQuery` ile mi tüketiyor?
- [ ] e2e test: ilk sayfa + 2. sayfa + son sayfa (nextCursor null) en az 3 case?

Skill'ler: `prisma-schema` (composite index + select discipline), `api-contract` (DTO/dalClient kontrat), `react-component` (data fetching pattern).
