---
name: form-mutation
description: Form gönderimi, kaydet/ekle/ileri butonları, TanStack Query mutation ve cache invalidation. Submit'in çalışmaması, butonun sonsuz "Kaydediliyor" kalması, sayfanın güncellenmemesi gibi sorunları önler. Yeni form veya mutation yazılırken referans alın.
---

# Form Mutation — Kaydet/Ekle/İleri Sorunları

Stack: **React 18 + Vite + JavaScript (JSX) + TanStack Query + React Router DOM v6**. API çağrıları **`apps/frontend/src/api/dalClient.js`** üzerinden.

## Belirtiler ve Çözümleri

| Belirti | Sebep | Çözüm |
|---------|-------|-------|
| Butona basıyorum, hiçbir şey olmuyor | onSubmit handler eksik / form `<form>` değil `<div>` | `<form onSubmit={...}>` + `e.preventDefault()` |
| "Kaydediliyor..." sonsuz kalıyor | mutation throw etti ama UI state reset olmadı | onError ve onSettled callback'leri kur |
| Kaydetti ama liste güncellenmedi | queryClient.invalidateQueries çağrılmadı | onSuccess'te invalidate |
| Submit ediyorum ama 2 kez kaydoluyor | mutation.mutate çift tetiklendi | button disabled={mutation.isPending} |
| Form tekrar açıldığında verilerim kayıp | initial value eksik | useState defaultValues / reset |
| "İleri" wizard'da çalışmıyor | step state validation gating eksik | per-step validate, geçersizse ilerleme |
| Validation hatası göstermiyor | zod errors UI'a iletilmedi | parsed.error.flatten() → state |
| 500 dönüyor ama UI "kaydedildi" diyor | onError yok, onSuccess her zaman çalışıyor | mutation.isError + error mesajı UI |

## Temel TanStack Query Mutation Pattern

```jsx
// apps/frontend/src/pages/ExamCreate.jsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { z } from 'zod';
import { dalClient } from '@/api/dalClient';

const ExamSchema = z.object({
  title: z.string().min(3, 'En az 3 karakter').max(200),
  description: z.string().max(2000).optional(),
  price: z.coerce.number().positive('Fiyat pozitif olmalı'),
  durationMinutes: z.coerce.number().int().positive(),
});

export function ExamCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);

  const createExam = useMutation({
    mutationFn: (data) => dalClient.exams.create(data),
    onSuccess: (exam) => {
      // Cache invalidate — liste sayfası ve detay path'i
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      queryClient.invalidateQueries({ queryKey: ['exams', 'mine'] });
      navigate(`/exams/${exam.id}`);
    },
    onError: (err) => {
      // ApiError ise yapısal, değilse generic mesaj
      if (err.code === 'VALIDATION_ERROR' && err.fieldErrors) {
        setFieldErrors(err.fieldErrors);
      } else {
        setFormError(err.message ?? 'Beklenmeyen bir hata oluştu');
      }
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const formData = new FormData(e.currentTarget);
    const raw = Object.fromEntries(formData);
    const parsed = ExamSchema.safeParse(raw);

    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    createExam.mutate(parsed.data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field name="title" label="Başlık" errors={fieldErrors.title} required />
      <Field name="description" label="Açıklama" errors={fieldErrors.description} />
      <Field name="price" label="Fiyat" type="number" step="0.01" errors={fieldErrors.price} required />
      <Field name="durationMinutes" label="Süre (dk)" type="number" errors={fieldErrors.durationMinutes} required />

      {formError && <p role="alert" className="text-red-600">{formError}</p>}

      <button
        type="submit"
        disabled={createExam.isPending}
        className="btn-primary"
      >
        {createExam.isPending ? 'Kaydediliyor…' : 'Kaydet'}
      </button>
    </form>
  );
}
```

**Önemli noktalar:**
- `e.preventDefault()` olmazsa sayfa reload olur, mutation iptal olur
- `disabled={isPending}` → çift tıklama koruması
- `onError` her zaman olmalı — eksikse butun sonsuz "Kaydediliyor" kalabilir
- `setFieldErrors({})` submit başında temizle — eski hatalar kalmasın
- `queryClient.invalidateQueries` query key'i tam tutsun — yanlış key cache'i kırmaz

## Cache Invalidation — Doğru Anahtar

```js
// queryKey hierarchy:
['exams']                        // tüm exam listeleri
['exams', { status: 'PUBLISHED' }] // belirli filtre
['exams', 'mine']                // kullanıcının kendi sınavları
['exams', examId]                // tek detay

// Mutation sonrası invalidation:
queryClient.invalidateQueries({ queryKey: ['exams'] });
// → ['exams', ...] ile başlayan TÜM key'ler invalid

// Sadece detay:
queryClient.invalidateQueries({ queryKey: ['exams', examId] });

// Çoklu invalidation:
['exams', 'mine'] ve ['exams', 'public'] ayrı ayrı invalidate
```

**Yaygın hata:** Liste `useQuery({ queryKey: ['exams', 'list'] })` kullanıyor ama mutation `invalidateQueries({ queryKey: ['exams'] })` çağırıyor. **Çalışır** çünkü prefix match. Ama mutation `invalidateQueries({ queryKey: ['exam'] })` (tekil) çağırıyorsa — eşleşmez, cache güncellenmez.

## dalClient'a Mutation Fonksiyonu Ekleme

```js
// apps/frontend/src/api/dalClient.js
const API_URL = import.meta.env.VITE_API_BASE_URL ?? '';  // boş: Vite proxy devreye girer

class ApiError extends Error {
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
    credentials: 'include',
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
    list: (params) => request(`/exams?${new URLSearchParams(params)}`),
    get: (id) => request(`/exams/${id}`),
    create: (data) => request('/exams', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/exams/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id) => request(`/exams/${id}`, { method: 'DELETE' }),
  },
  questions: {
    create: (examId, data) => request(`/exams/${examId}/questions`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/questions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  // ...
};

export { ApiError };
```

Form'lar component içinde fetch yazmaz — daima `dalClient` üzerinden. Tek yerde tutmak hata yüzeyini küçültür.

## "İleri" / Wizard Pattern

Çok adımlı form (örn. sınav oluşturma → sorular → fiyat → yayımla):

```jsx
import { useState } from 'react';

export function ExamWizard() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({});
  const [stepErrors, setStepErrors] = useState({});

  const validateStep = (currentStep, currentData) => {
    if (currentStep === 1) {
      const parsed = Step1Schema.safeParse(currentData);
      if (!parsed.success) {
        setStepErrors(parsed.error.flatten().fieldErrors);
        return false;
      }
    }
    // ... diğer adımlar
    setStepErrors({});
    return true;
  };

  const next = (stepData) => {
    const merged = { ...data, ...stepData };
    if (!validateStep(step, merged)) return; // geçersizse ilerleme
    setData(merged);
    setStep((s) => s + 1);
  };

  const back = () => setStep((s) => Math.max(1, s - 1));

  return (
    <>
      {step === 1 && <Step1 defaultValues={data} errors={stepErrors} onNext={next} />}
      {step === 2 && <Step2 defaultValues={data} errors={stepErrors} onNext={next} onBack={back} />}
      {step === 3 && <Step3 defaultValues={data} onSubmit={(final) => submitMutation.mutate({ ...data, ...final })} onBack={back} />}
    </>
  );
}
```

**"İleri" çalışmıyorsa kontrol:**
- `onNext` prop alıyor mu Step1?
- Step1 form'unda `e.preventDefault()` var mı?
- `validateStep` true dönüyor mu? (console.log ile bak)
- `setStep` batch'te kaybolmamış mı? Tek yerden çağrılsın, render içinde değil.

## Idempotency

**Frontend:** `disabled={isPending}` yeterli çoğu zaman.

**Backend zorunluluğu:** DB constraint. Örn. Purchase'da `(userId, examId)` unique → çift gönderim DB'de reddedilir, mutation onError'a düşer.

İleri seviye için idempotency-key:
```js
// Form'da uuid üret, hidden input
const idempotencyKey = useMemo(() => crypto.randomUUID(), []);

createExam.mutate({ ...data, idempotencyKey });
```

Backend aynı key'le ikinci request görürse eskinin sonucunu döner.

## Optimistic Update

Hızlı UX için:

```js
const updateExam = useMutation({
  mutationFn: (data) => dalClient.exams.update(data.id, data),
  onMutate: async (data) => {
    await queryClient.cancelQueries({ queryKey: ['exams', data.id] });
    const previous = queryClient.getQueryData(['exams', data.id]);
    queryClient.setQueryData(['exams', data.id], { ...previous, ...data });
    return { previous };
  },
  onError: (err, data, context) => {
    // Geri al
    queryClient.setQueryData(['exams', data.id], context.previous);
  },
  onSettled: (data) => {
    queryClient.invalidateQueries({ queryKey: ['exams', data.id] });
  },
});
```

Optimistic = UI hemen güncel, server fail ederse otomatik geri al.

## Toast / Bildirim

Submit fail'larda kullanıcı görmeli:

```js
import { toast } from 'sonner'; // veya kullanılan toast lib

const createExam = useMutation({
  mutationFn: (data) => dalClient.exams.create(data),
  onSuccess: () => {
    toast.success('Sınav oluşturuldu');
    // ...
  },
  onError: (err) => {
    toast.error(err.message ?? 'Hata oluştu');
  },
});
```

Sadece form içinde error göstermek yetmez — kullanıcı sayfa altındaki form alanını görmeyebilir, üst köşede toast bekler.

## Frontend ↔ Backend Akış Doğrulama

Submit çalışmıyorsa **uçtan uca** debug — sırayla:

1. **Form submit oluyor mu?** Browser DevTools Network tab → request gönderildi mi?
   - Hayır: `onSubmit` bind edildi mi, `e.preventDefault()` ile sayfa reload olmuyor mu?
2. **Request gidiyor mu?** Network tab'de URL ve method doğru mu?
   - 404: yanlış path. dalClient'taki path backend route ile eşleşiyor mu?
   - CORS error: backend `enableCors` doğru mu, frontend `credentials: 'include'` mı?
3. **Backend istek alıyor mu?** NestJS log'da görünüyor mu?
4. **DTO validate ediliyor mu?** 400 dönüyorsa validation fail. Response body'de `fieldErrors` var.
5. **Use Case çalıştı mı?** Backend log'da business logic adımları görünüyor mu?
6. **DB değişti mi?** Prisma Studio veya `psql` ile kontrol.
7. **Response geliyor mu?** Network response body'i bak.
8. **mutation.onSuccess tetiklendi mi?** console.log koy onSuccess başına.
9. **invalidateQueries çağrıldı mı, doğru key mi?** TanStack Query DevTools ile bak.
10. **UI güncel mi?** Liste re-render oluyor mu?

Hangi adımda kayboluyor — sorun orada.

## TanStack Query DevTools

`@tanstack/react-query-devtools` kurulu olsun. `<ReactQueryDevtools />` App'e ekle. Cache state'ini görsel olarak gör — invalidation çalışıyor mu, query stale mi, fresh mi.

## Mutation Throw vs Return

TanStack Query mutation'da `mutationFn` **throw** edebilir — onError yakalar. Server Action gibi return value'ya sıkışmaya gerek yok.

```js
// ✓ doğru
mutationFn: async (data) => {
  const result = await dalClient.exams.create(data);
  return result;
  // ApiError throw olursa onError yakalar
},

// ✗ yanlış (gereksiz try/catch — hatayı yutuyor)
mutationFn: async (data) => {
  try {
    return await dalClient.exams.create(data);
  } catch (e) {
    return null; // onSuccess sandı, kullanıcıya yanlış mesaj
  }
},
```

## Checklist (her form için)

- [ ] `<form onSubmit>` + `e.preventDefault()` var mı?
- [ ] zod / class-validator ile validation var mı?
- [ ] field error'lar UI'da gösteriliyor mu?
- [ ] form-level error UI var mı (mutation.isError)?
- [ ] Buton `disabled={mutation.isPending}` mi?
- [ ] onSuccess'te `queryClient.invalidateQueries` çağrılıyor mu, doğru key mi?
- [ ] Hangi sayfaları etkiliyor? Hepsinin query key'leri invalidate ediliyor mu?
- [ ] onError'da kullanıcıya geri bildirim var mı (toast veya inline)?
- [ ] Başarı sonrası navigate veya reset var mı?
- [ ] DB constraint çift submit'i koruyor mu?
- [ ] Vitest ile happy path + validation fail + server error test'i var mı?

Skill: `error-handling` backend tarafı için, `api-contract` endpoint tutarlılığı için.
