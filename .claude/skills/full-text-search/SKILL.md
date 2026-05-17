---
name: full-text-search
description: PostgreSQL tsvector + GIN index ile full-text search. Test/Educator/Topic isim aramaları için `ILIKE %...%` yerine kullanılır. Arama endpoint'i, autocomplete veya kullanıcı arıyorsa indexed full-text search kuruluyorsa referans alın.
---

# Full-Text Search — PostgreSQL tsvector

`title ILIKE '%matematik%'` küçük tabloda (<10k satır) sorun değil, ama büyüyünce **sequential scan** olur — milisaniyeden saniyeye çıkar. PostgreSQL `tsvector` + GIN index ile arama log(n)'ye düşer ve Türkçe için kök bulma (lemmatization) ücretsiz gelir.

## Ne Zaman tsvector

| Durum | Yaklaşım |
|-------|----------|
| `id` ile arama | Düz `where: { id }` — index var |
| Tam slug eşleşmesi | `where: { slug }` + unique index |
| "matematik" kelimesini içeren testler | **tsvector** |
| Autocomplete (prefix arama) | tsvector `prefix` matching VEYA pg_trgm |
| Tipo toleransı ("matematik" ↔ "matemetik") | pg_trgm (`similarity()`) |
| Çok dilli arama, eşanlamlı | tsvector + custom dictionary |

Sınav Salonu için ana ihtiyaç: **`ExamTest.title`, `Educator.username/bio`, `Topic.name` üzerinde Türkçe arama**.

## Kurulum — Schema

Prisma şu an `tsvector` tipini native desteklemez. SQL migration ile elle ekleriz; Prisma `Unsupported("tsvector")` ile şemada yer tutar.

**1. Migration SQL** (`prisma/migrations/YYYYMMDDNNNNNN_add_examtest_search/migration.sql`):

```sql
-- 1) tsvector kolonu (generated column — INSERT/UPDATE'de otomatik dolar)
ALTER TABLE "exam_tests"
  ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A')
  ) STORED;

-- 2) GIN index — tsvector için zorunlu (B-tree çalışmaz)
CREATE INDEX CONCURRENTLY "exam_tests_search_idx"
  ON "exam_tests" USING GIN ("search_vector");
```

> `CONCURRENTLY`: prod'da lock almadan oluşturur. Geliştirme için kaldırabilirsin. Migration'ı manuel uyguluyorsan `migration-planner` skill'ine bak.

**2. Schema (Prisma):**

```prisma
model ExamTest {
  // ...
  title         String
  searchVector  Unsupported("tsvector")?  @map("search_vector")
}
```

Prisma generate edince `searchVector` ile etkileşim yapamazsın (Unsupported); query'leri raw SQL ile yazacağız.

## Türkçe Konfigürasyon

`to_tsvector('simple', ...)` lemmatization yapmaz — "matematikçi" ile "matematik" eşleşmez. Türkçe için iki seçenek:

**Seçenek A — Basit (önerilen başlangıç):** `'simple'` config'i kullan, lowercase + accent fold. Kelime kökü gerekli değilse yeterli.

**Seçenek B — pg_trgm + tsvector kombinasyonu:** tsvector tam eşleşme, pg_trgm benzerlik için. Daha karmaşık ama Türkçe morfolojiye iyi cevap verir:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- B-tree GIN index
CREATE INDEX CONCURRENTLY "exam_tests_title_trgm_idx"
  ON "exam_tests" USING GIN (title gin_trgm_ops);
```

Sorgu: `WHERE title % 'matematik'` (similarity > eşik), sıralama: `ORDER BY similarity(title, 'matematik') DESC`.

**Seçenek C — Custom Turkish dictionary:** PostgreSQL `CREATE TEXT SEARCH CONFIGURATION ... (turkish_stem)`. Snowball Turkish stemmer var ama gürültü çok. Production ihtiyacı netleşmeden öneri DEĞİL.

## Sorgu — Raw SQL ile

```ts
// application/use-cases/SearchTestsUseCase.ts
import { prisma } from '../../infrastructure/database/prisma';

type Params = {
  query: string;        // kullanıcı girdisi
  limit?: number;
  examTypeId?: string;
};

export class SearchTestsUseCase {
  async execute({ query, limit = 20, examTypeId }: Params) {
    const trimmed = query.trim();
    if (trimmed.length < 2) return { items: [] };

    // tsquery: 'mat ema' → 'mat & ema:*' (her token prefix match)
    const tsquery = trimmed
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => t.replace(/[^\p{L}\p{N}]/gu, '') + ':*')
      .join(' & ');

    if (!tsquery) return { items: [] };

    // Parametreli raw query — SQL injection güvenli
    return {
      items: await prisma.$queryRaw<Array<{
        id: string;
        title: string;
        rank: number;
      }>>`
        SELECT
          id,
          title,
          ts_rank(search_vector, to_tsquery('simple', ${tsquery})) AS rank
        FROM exam_tests
        WHERE
          search_vector @@ to_tsquery('simple', ${tsquery})
          AND status = 'PUBLISHED'
          AND deleted_at IS NULL
          ${examTypeId ? prisma.sql`AND exam_type_id = ${examTypeId}` : prisma.sql``}
        ORDER BY rank DESC, id DESC
        LIMIT ${limit}
      `,
    };
  }
}
```

**Önemli güvenlik notları:**
- `prisma.$queryRaw` template literal **parametre olarak** ${tsquery} taşır → SQL injection'a karşı güvenli.
- Manuel string concat (`` `... ${tsquery} ...` ``) yapma, daima template literal'da `${}` kullan.
- Kullanıcı girdisindeki özel karakterleri (`&`, `|`, `!`, `'`) temizle — `tsquery` parse'ı çalmasın. Yukarıdaki `replace(/[^\p{L}\p{N}]/gu, '')` token bazında temizler.

## Birden Fazla Alan + Ağırlık

```sql
-- title (A ağırlık), description (B), educator username (C)
ALTER TABLE "exam_tests"
  ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B')
  ) STORED;
```

Eğitici adını da aramak istiyorsak ya:
- `educator_username` snapshot kolonu tut (denormalize), generated column'a ekle.
- Veya search query'sini iki tabloyu UNION ile birleştir.

Snapshot kolonu daha hızlı; karşılığı: educator username değişince tüm test'leri update etmek gerek (trigger veya UseCase içinde).

## Autocomplete

Prefix arama için `:*` operatörü:

```ts
const tsquery = trimmed.replace(/[^\p{L}\p{N}]/gu, '') + ':*';
```

`'matem:*'` → "matematik", "matematikçi", "matemetik" (eğer indexlenmişse) eşleşir.

Performans için autocomplete sonuç sayısını düşük tut (`LIMIT 8`), `staleTime: 0` ile cache'leme, kullanıcı her keystroke'ta yeni query.

## Frontend — Debounce + dalClient

```jsx
import { useState, useEffect, useDeferredValue } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dalClient } from '@/api/dalClient';

export function SearchBar() {
  const [text, setText] = useState('');
  const debounced = useDeferredValue(text);

  const { data, isFetching } = useQuery({
    queryKey: ['search', 'tests', debounced],
    queryFn: () => dalClient.search.tests({ query: debounced }),
    enabled: debounced.trim().length >= 2,
    staleTime: 30_000,
  });

  return (
    <div>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Test ara..."
        aria-label="Test ara"
      />
      {isFetching && <Spinner size="sm" />}
      <ul role="listbox">
        {data?.items.map((t) => (
          <li key={t.id} role="option">{t.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

`useDeferredValue` React 18'in input lag'ını azaltır. `lodash.debounce` da geçerli; ikisini birden kullanma.

## dalClient

```js
search: {
  tests: ({ query, examTypeId, limit = 20 } = {}) => {
    const qs = new URLSearchParams({ query });
    if (examTypeId) qs.set('examTypeId', examTypeId);
    if (limit) qs.set('limit', String(limit));
    return request(`/search/tests?${qs.toString()}`);
  },
},
```

## Index Bakımı

- `tsvector` generated column otomatik güncellenir. Trigger yazmana gerek yok.
- `REINDEX INDEX CONCURRENTLY exam_tests_search_idx;` — büyük tablo dağılınca planla.
- `VACUUM ANALYZE exam_tests;` — istatistikleri güncelle, planner doğru karar versin.

## Yapmayacakların

- **`ILIKE '%foo%'` büyük tabloda** — sequential scan, GIN var ama kullanılmaz.
- **`LIKE 'foo%'` (prefix) yerine tsvector** — prefix için btree+text_pattern_ops da yeterli. tsvector overkill.
- **String concat ile `to_tsquery`** — SQL injection. Daima parametreli.
- **Generated column yerine trigger** — fazladan karmaşık, generated daha temiz.
- **GIN index yerine B-tree tsvector'a** — B-tree tsvector'da işe yaramaz.
- **`to_tsquery` ile kullanıcı girdisini doğrudan** — özel karakter parse fail eder. Token bazında temizle veya `websearch_to_tsquery` kullan.

## websearch_to_tsquery — Daha Az Riskli Alternatif

`to_tsquery` operatör (`&`, `|`, `!`) bekler. `websearch_to_tsquery` Google tarzı girdi kabul eder (`"sınav" -test`):

```sql
WHERE search_vector @@ websearch_to_tsquery('simple', ${userInput})
```

Kullanıcı girdisini ham olarak verebilirsin, parse hatası fırlatmaz. Production için **önerilen**.

## Migration Adımları (mevcut tabloya ekleme)

1. **Expand** — `searchVector` kolonu (generated) ekle. Migration deploy.
2. **Build index** — `CREATE INDEX CONCURRENTLY` ile GIN. Saatler sürebilir büyük tabloda.
3. **Frontend feature flag** — yeni endpoint açık ama UI eski arama. Doğrulama yap.
4. **Switch** — UI'yı tsvector endpoint'ine yönlendir.
5. **Eski endpoint'i sil** — `git grep` ile kullanım sıfır mı kontrol et.

Detay: `migration-planner` skill'i.

## Checklist (yeni arama endpoint'i)

- [ ] tsvector kolonu generated mı (manuel trigger değil)?
- [ ] GIN index `CONCURRENTLY` ile mi oluşturuldu?
- [ ] Türkçe için config seçildi mi (`simple` ya da custom)?
- [ ] Kullanıcı girdisi token-temizleme + `to_tsquery` veya `websearch_to_tsquery`?
- [ ] Parametreli `$queryRaw` mı, string concat var mı?
- [ ] LIMIT zorunlu mu (max 100)?
- [ ] dalClient'a method eklendi mi?
- [ ] Frontend debounce/deferredValue ile mi?
- [ ] e2e test: var olan kelime + olmayan kelime + boş query?

Skill'ler: `prisma-schema` (Unsupported tipi), `migration-planner` (online index ekleme), `pagination` (büyük arama sonuçları için cursor).
