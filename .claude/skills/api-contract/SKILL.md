---
name: api-contract
description: Frontend ↔ backend endpoint kontratı tutarlılığı. Endpoint not found, 404, CORS, method mismatch, DTO uyumsuzluğu hatalarını önler. Yeni endpoint eklerken veya frontend-backend arası iletişim hatası olduğunda referans alın.
---

# API Contract — Endpoint Tutarlılığı

## Temel İlke

Frontend ve backend ayrı yazıldığı için **kontrat sözleşme** halinde olmalı. Sözleşme bozulursa: 404, 405, 400, CORS hatası, sessiz fail. Çoğu "endpoint çalışmıyor" sorunu kontrat senkronu eksikliğidir.

## Endpoint Tanımı Checklist

Yeni endpoint yazarken **her madde** doğrulanmalı:

- [ ] **Method**: GET (oku), POST (yarat), PATCH (kısmi güncelle), PUT (tam değiştir), DELETE (sil). Hangi method?
- [ ] **Path**: `/api/exams`, `/api/exams/:id`, `/api/exams/:id/questions`. RESTful + kebab-case + plural.
- [ ] **Path params**: tipi belli mi (`:id` cuid mi, uuid mi, sayı mı)? Validation pipe ile parse edilmeli.
- [ ] **Query params**: opsiyonel mi, default'u var mı? DTO'da `@IsOptional`.
- [ ] **Body** (POST/PATCH/PUT): DTO sınıfı + validation dekoratörleri.
- [ ] **Auth**: `@UseGuards(JwtAuthGuard)` mı, `@Public()` mı? Açık yaz.
- [ ] **Response**: shape ne, status kod ne (200, 201, 204)?
- [ ] **Error response**: 4xx durumları belgele (404, 409, 422).

## Kontrat Senkronizasyonu

Frontend JavaScript (JSX) olduğu için tip paylaşımı yok — yerine **disiplin** ve **test** ile sözleşme tutulur:

1. **Backend DTO** + **frontend zod schema** aynı alanları içersin. Yeni alan eklendiğinde her iki tarafa da ekle.
2. **e2e test** (Playwright) gerçek HTTP üzerinden full akışı doğrular — kontrat bozulursa test düşer.
3. **dalClient.js** fonksiyon adları backend Use Case'leriyle birebir eşlessin (`createExam` ↔ `CreateExamUseCase`).

**JSDoc ile sözleşme açıklaması:**
```js
/**
 * @typedef {Object} ExamSummary
 * @property {string} id
 * @property {string} title
 * @property {number} price
 * @property {string} educatorId
 * @property {string|null} publishedAt - ISO string
 */

/**
 * @typedef {Object} CreateExamRequest
 * @property {string} title
 * @property {string} [description]
 * @property {number} price
 * @property {number} durationMinutes
 */

/**
 * @param {CreateExamRequest} data
 * @returns {Promise<ExamSummary>}
 */
export const createExam = (data) => request('/exams', { method: 'POST', body: JSON.stringify(data) });
```

JSDoc IDE autocomplete + tip kontrol verir, runtime maliyeti yok. TypeScript zorunluluğu yok ama disiplin gerekli.

## Endpoint Kayıt — Zincir

Yeni endpoint çalışmıyorsa kontrol et:

1. **Service** method var mı?
2. **Controller**'da method tanımlı mı, decorator'ı (`@Get/@Post...`) doğru mu?
3. **Module**'da controller `controllers` array'inde mi?
4. **AppModule**'da modül `imports` array'inde mi?
5. **main.ts** global prefix var mı? `app.setGlobalPrefix('api')` → tüm endpoint'ler `/api/...` altında.
6. **CORS** açık mı? `app.enableCors({ origin: '...' })`.
7. **Frontend** doğru URL'e mi istek atıyor (env'de `VITE_API_BASE_URL` — Next.js değil Vite, `NEXT_PUBLIC_*` değil)?

90% endpoint hatası bu zincirin bir halkasında.

## Frontend API Client (dalClient.js)

Sinav Salonu'nda tek merkezi client: `apps/frontend/src/api/dalClient.js`. Component'lerde direkt `fetch`/`axios` yasak.

```js
// apps/frontend/src/api/dalClient.js
// VITE_API_BASE_URL env yoksa Vite proxy devreye girer (dev'de boş bırakılır)
const API_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export class ApiError extends Error {
  constructor(status, code, message, fieldErrors) {
    super(message);
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

async function request(path, init = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
    credentials: 'include',  // JWT cookie için
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      body.code ?? `HTTP_${res.status}`,
      body.message ?? res.statusText,
      body.fieldErrors,
    );
  }
  if (res.status === 204) return null;
  return res.json();
}

export const dalClient = {
  exams: {
    list: (params = {}) => request(`/exams?${new URLSearchParams(params)}`),
    get: (id) => request(`/exams/${id}`),
    create: (data) => request('/exams', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/exams/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id) => request(`/exams/${id}`, { method: 'DELETE' }),
    publish: (id) => request(`/exams/${id}/publish`, { method: 'POST' }),
  },
  questions: { /* ... */ },
  attempts: { /* ... */ },
  purchases: { /* ... */ },
  // ...
};
```

**Yeni endpoint ekleme:** Backend'de Use Case + Controller eklendi mi? `dalClient.<resource>.<action>` fonksiyonunu da ekle. Eksikse component fetch'i kendisi yazmaya kalkar — kural ihlali.

**Query/Mutation kullanım:**
```jsx
import { useQuery, useMutation } from '@tanstack/react-query';
import { dalClient } from '@/api/dalClient';

// Query
const { data, error } = useQuery({
  queryKey: ['exams', { status: 'PUBLISHED' }],
  queryFn: () => dalClient.exams.list({ status: 'PUBLISHED' }),
});

// Mutation
const createExam = useMutation({
  mutationFn: (data) => dalClient.exams.create(data),
});
```

## CORS Doğru Yapılandırma

Backend:
```ts
// main.ts
app.enableCors({
  origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'],
  credentials: true,  // cookie/auth header için şart
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
});
```

`.env`:
```
CORS_ORIGIN=http://localhost:3000,https://sinavsalonu.com
```

Frontend `credentials: 'include'` + backend `credentials: true` ikisi birden olmalı. Sadece biri varsa cookie gitmez/alınmaz.

## Versiyon Stratejisi

Şu an versiyon yok (iç API). İleride değiştirmek istersen:

- Path-based: `/api/v1/exams`, `/api/v2/exams` (basit, açık)
- Header-based: `Accept: application/vnd.dal.v2+json` (RESTful purist'lerin tercihi, daha karmaşık)
- Default: path-based başla. Sadece dış consumer eklenince düşün.

## Method-Status Eşleşmesi

| Method | Başarılı | Beden |
|--------|---------|--------|
| GET | 200 OK | resource |
| POST (yarat) | 201 Created | yeni resource |
| POST (action) | 200 OK | sonuç |
| PATCH/PUT | 200 OK | güncellenmiş resource |
| DELETE | 204 No Content | (boş) |

Yanlış status (örn. POST sonrası 200 yerine 204) frontend'de "yanıt yok" sanılır, hata bulması zor olur.

## Path Parametre Tipi

```ts
@Get(':id')
findOne(@Param('id') id: string) { ... }

// Sayısal ID için:
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) { ... }

// CUID validasyonu için custom pipe veya class-validator:
@Get(':id')
findOne(@Param() params: GetExamByIdParams) { ... }

class GetExamByIdParams {
  @IsString() @Matches(/^c[a-z0-9]{24}$/) id!: string;
}
```

## Headers'ı Unutma

Frontend FormData gönderiyorsa `Content-Type` SİLMEK gerek (browser otomatik multipart boundary ekler):
```ts
fetch(url, { body: formData });  // Content-Type set ETME
```

JSON gönderiyorsa **mutlaka** `Content-Type: application/json`. Aksi halde NestJS body undefined görür → 400.

## Endpoint Test'i (e2e)

Her endpoint için en az bir e2e:
```ts
// apps/api/test/exam.e2e-spec.ts
describe('POST /api/exams', () => {
  it('returns 401 without auth', async () => {
    await request(app.getHttpServer()).post('/api/exams').send({}).expect(401);
  });

  it('returns 400 when title missing', async () => {
    await request(app.getHttpServer())
      .post('/api/exams')
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 50 })
      .expect(400);
  });

  it('returns 201 with valid payload', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/exams')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'TYT', price: 50, durationMinutes: 60 })
      .expect(201);
    expect(res.body.id).toBeDefined();
  });
});
```

## Hızlı Tanı — "Endpoint Çalışmıyor"

| Belirti | Sebep |
|---------|-------|
| 404 | Path yanlış / global prefix unutuldu / module'a controller eklenmedi |
| 405 | Method yanlış (frontend POST, backend GET) |
| 400 | DTO validation fail / Content-Type yok / FormData yerine JSON |
| 401 | Auth header gönderilmiyor / cookie credentials yok |
| 403 | Auth çalıştı ama yetki yok (owner check fail) |
| 500 | Backend exception — error-handling skill'ine bak |
| CORS hatası | enableCors yok / origin uyumsuz / credentials mismatch |
| Network error | Backend ayakta değil / yanlış port / firewall |

## Checklist (her yeni endpoint)

- [ ] Path konvansiyona uygun, plural, kebab-case
- [ ] Method anlamlı (POST yarat, GET oku, ...)
- [ ] DTO + validation tanımlı
- [ ] Auth karar verildi (`@UseGuards` veya `@Public()`)
- [ ] Response shape `packages/shared/`'da
- [ ] Frontend API client'a fonksiyon eklendi
- [ ] e2e test: 401, 400, başarılı case en az
- [ ] Swagger annotation (varsa)
