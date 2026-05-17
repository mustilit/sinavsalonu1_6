---
name: accessibility
description: Frontend accessibility (a11y) — semantic HTML, ARIA, keyboard navigation, Playwright + axe-core ile otomatik kontrol. Yeni sayfa, form, modal, listbox bileşeni yazılırken veya a11y regresyon koruması istenirken referans alın.
---

# Accessibility — Sınav Salonu

Eğitim platformu için a11y soft requirement değil. Görme engelli/motor zorluk yaşayan aday sınava giremiyorsa platform işini yapmıyor demektir. WCAG 2.1 AA hedef.

## Temel Prensipler

1. **Semantic HTML her zaman ARIA'dan üstündür.** `<button>` > `<div role="button">`.
2. **Klavye odakla erişilebilir** olsun her interaktif element — `Tab`, `Enter`, `Escape`.
3. **Görsel olmayan kullanıcılar için context** — `aria-label`, `aria-describedby`, `role`, `alt`.
4. **Renk tek başına anlam taşımasın** — kırmızı = hata + ikon + metin.
5. **Focus görünür** — Tailwind `focus-visible:ring-2 focus-visible:ring-indigo-500`.

## Component Bazında Pattern'ler

### Buton

```jsx
// İYİ
<button
  type="button"
  onClick={onSave}
  disabled={isSaving}
  aria-label={isSaving ? 'Kaydediliyor' : 'Kaydet'}
  className="px-4 py-2 bg-indigo-600 text-white rounded
             focus-visible:outline-none focus-visible:ring-2
             focus-visible:ring-indigo-300
             disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isSaving ? <Spinner size="sm" /> : 'Kaydet'}
</button>

// KÖTÜ
<div onClick={onSave} className="...">Kaydet</div>
```

`<button>` için `type` mutlaka belirt — form içinde `type="button"` olmazsa submit tetikler.

### Form Input

```jsx
<div className="space-y-1">
  <label htmlFor="exam-title" className="block text-sm font-medium">
    Test başlığı
  </label>
  <input
    id="exam-title"
    type="text"
    value={title}
    onChange={(e) => setTitle(e.target.value)}
    aria-invalid={Boolean(errors.title)}
    aria-describedby={errors.title ? 'exam-title-error' : undefined}
    className="..."
  />
  {errors.title && (
    <p id="exam-title-error" role="alert" className="text-sm text-red-600">
      {errors.title}
    </p>
  )}
</div>
```

`htmlFor` + `id` zorunlu — screen reader label'ı input'la eşler. `aria-label` ikinci tercih.

### Modal / Dialog

Radix UI `@radix-ui/react-dialog` zaten focus trap + Escape + scroll lock dahil verir. Sıfırdan yazma:

```jsx
import * as Dialog from '@radix-ui/react-dialog';

<Dialog.Root>
  <Dialog.Trigger asChild>
    <button>Sil</button>
  </Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 bg-black/50" />
    <Dialog.Content
      className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                 bg-white p-6 rounded shadow-lg"
      aria-describedby="confirm-desc"
    >
      <Dialog.Title>Silmek istediğine emin misin?</Dialog.Title>
      <Dialog.Description id="confirm-desc">
        Bu işlem geri alınamaz.
      </Dialog.Description>
      {/* ... */}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

`Title` ve `Description` Radix tarafından otomatik `aria-labelledby`/`aria-describedby` ile bağlanır.

### Liste / Listbox

Custom select/combobox yazmadan önce `@radix-ui/react-select` kullan — keyboard nav (`ArrowUp/Down`, `Home/End`, type-ahead) hazır. Custom yapıyorsan:

```jsx
<ul role="listbox" aria-label="Test seç" aria-activedescendant={activeId}>
  {tests.map((t) => (
    <li
      key={t.id}
      id={`test-${t.id}`}
      role="option"
      aria-selected={t.id === selectedId}
      tabIndex={t.id === activeId ? 0 : -1}
      onKeyDown={handleKey}
    >
      {t.title}
    </li>
  ))}
</ul>
```

### Tablo

```jsx
<table>
  <caption className="sr-only">Eğiticinin testleri</caption>
  <thead>
    <tr>
      <th scope="col">Başlık</th>
      <th scope="col">Fiyat</th>
      <th scope="col">Durum</th>
    </tr>
  </thead>
  <tbody>
    {tests.map((t) => (
      <tr key={t.id}>
        <th scope="row">{t.title}</th>
        <td>{formatPrice(t.priceCents)}</td>
        <td>
          <span className="sr-only">Durum: </span>
          <StatusBadge status={t.status} />
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

`<caption>` screen reader için tablonun amacını söyler, görsel olarak gizli (`sr-only`).

### İkon-Only Buton

```jsx
<button aria-label="Sil" onClick={onDelete}>
  <Trash2 className="h-4 w-4" aria-hidden="true" />
</button>
```

İkon `aria-hidden="true"` çünkü buton zaten `aria-label` ile anlamlandırılıyor — duplicate vermesin.

### Toast / Snackbar

```jsx
<div role="status" aria-live="polite">
  Kaydedildi
</div>

// Hata için
<div role="alert" aria-live="assertive">
  Bağlantı koptu
</div>
```

`react-hot-toast` ve `sonner` (ikisi de projede yüklü) bunları otomatik verir; kontrol et.

### Skip Link

Klavye kullanıcıları her sayfada Sidebar'ı geçmesin diye:

```jsx
// Layout.jsx — body'nin ilk child'ı
<a
  href="#main"
  className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2
             focus:px-3 focus:py-2 focus:bg-white focus:rounded focus:shadow"
>
  Ana içeriğe atla
</a>

<main id="main">{children}</main>
```

## Renk Kontrastı

WCAG AA: normal metin için **4.5:1**, büyük metin (18pt+) için **3:1**.

Tailwind varsayılan paletinde güvenli kombinasyonlar:
- `text-gray-900` on `bg-white` ✅
- `text-gray-600` on `bg-white` — sınırda, kontrol et
- `text-indigo-600` on `bg-white` ✅
- `text-white` on `bg-indigo-600` ✅

Tehlikeli:
- `text-gray-400` on `bg-gray-50` — kontrast düşük
- `text-yellow-500` on `bg-white` — sarı tonları sıkıntılı

Şüphedeysen tarayıcı DevTools → Lighthouse → Accessibility veya `axe-core` ile kontrol.

## Klavye Test Akışı

Her yeni sayfada manuel:
1. `Tab` ile baştan sona dolaş — tüm interaktif elementlere odak gidiyor mu?
2. Odak görünür mü? (focus ring)
3. `Enter` / `Space` buton'ları tetikliyor mu?
4. Modal açıldığında odak modal içine giriyor mu, kapanınca tetikleyene dönüyor mu?
5. `Escape` modal/dropdown'ı kapatıyor mu?
6. Tab sırası mantıklı mı (görsel sıraya uyuyor mu)?

## Playwright + axe-core Otomatik Test

Proje `@playwright/test ^1.58.2` zaten yüklü. axe-core entegrasyonu:

**Kurulum:**
```bash
cd apps/frontend
npm install --save-dev @axe-core/playwright
```

**Fixture (her test sayfasında a11y check):**

```ts
// apps/frontend/e2e/fixtures/axe.ts
import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export const test = base.extend<{ makeAxeBuilder: () => AxeBuilder }>({
  makeAxeBuilder: async ({ page }, use) => {
    const builder = () =>
      new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        // Üçüncü taraf widget'lar (örn. Stripe iframe) hariç
        .exclude('iframe[src*="stripe.com"]')
        // Bilinçli olarak ihmal edilen kurallar (gerekçeli olmalı)
        .disableRules([
          // 'color-contrast', // ASLA gerekçesiz kapatma
        ]);
    await use(builder);
  },
});

export { expect };
```

**Test örneği:**

```ts
// apps/frontend/e2e/specs/a11y.spec.ts
import { test, expect } from '../fixtures/axe';

test.describe('a11y — kritik sayfalar', () => {
  test('Home', async ({ page, makeAxeBuilder }) => {
    await page.goto('/');
    const results = await makeAxeBuilder().analyze();
    expect(results.violations).toEqual([]);
  });

  test('Explore', async ({ page, makeAxeBuilder }) => {
    await page.goto('/Explore');
    const results = await makeAxeBuilder().analyze();
    expect(results.violations).toEqual([]);
  });

  test('Login form', async ({ page, makeAxeBuilder }) => {
    await page.goto('/Login');
    const results = await makeAxeBuilder().analyze();
    expect(results.violations).toEqual([]);
  });

  test('TakeTest sınav ekranı', async ({ page, makeAxeBuilder, studentPage, publishedTest }) => {
    await studentPage.goto(`/TakeTest?id=${publishedTest.id}`);
    const results = await makeAxeBuilder({ page: studentPage }).analyze();
    expect(results.violations).toEqual([]);
  });
});
```

**Kritik akışların başına a11y check serpiştir:**

```ts
test('öğrenci test satın alır', async ({ studentPage, publishedTest, makeAxeBuilder }) => {
  await studentPage.goto(`/test/${publishedTest.id}`);

  // Her ekran geçişinde a11y snapshot
  const beforePurchase = await makeAxeBuilder({ page: studentPage }).analyze();
  expect(beforePurchase.violations).toEqual([]);

  await studentPage.getByRole('button', { name: /satın al/i }).click();
  // ... payment flow

  const afterPurchase = await makeAxeBuilder({ page: studentPage }).analyze();
  expect(afterPurchase.violations).toEqual([]);
});
```

## Hangi Sayfaları Test Et?

Tüm sayfaları test ek e2e maliyetini katlar. Öncelik:

**Mutlaka:**
- Home, Login, Register, Explore, TestDetail, TakeTest (aday akışı)
- CreateTest, EditTest (eğitici akışı)
- AdminDashboard, AdminObjections (admin)

**Kontrol et ama her commit'te değil:**
- Manage* sayfaları (admin/educator yönetim)
- Settings sayfaları
- Live session sayfaları

**Atlanabilir (statik):**
- About, Privacy, Contact, Partnership, Support

## Violation Reporting

axe-core fail olunca raporu okuyabilmek için:

```ts
test('a11y — Explore', async ({ page, makeAxeBuilder }) => {
  await page.goto('/Explore');
  const results = await makeAxeBuilder().analyze();

  if (results.violations.length) {
    console.log(JSON.stringify(results.violations, null, 2));
  }
  expect(results.violations).toEqual([]);
});
```

Veya `playwright-html-reporter` ile tüm violation'lar HTML raporda görünür.

## CI Entegrasyonu

```yaml
# .github/workflows/frontend-e2e.yml (yeni veya mevcut)
- name: Install Playwright deps
  working-directory: apps/frontend
  run: npx playwright install --with-deps chromium

- name: Run a11y tests
  working-directory: apps/frontend
  run: npx playwright test e2e/specs/a11y.spec.ts

- name: Upload Playwright report
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: apps/frontend/playwright-report
```

## Yapmayacakların

- **Erişilebilirlik kuralını gerekçesiz kapatma** — `disableRules(['color-contrast'])` yazıyorsan yorum yaz neden.
- **`outline: none` global** — focus ring kaybeder. `:focus-visible` ile yönet.
- **`<div onClick>`** — semantic element kullan.
- **Sadece renkle hata göster** — ikon + metin de olsun.
- **Modal'da focus trap eksik** — Radix kullan ya da kendin yaz.
- **Placeholder = label** — placeholder kaybolur, label kalıcı olmalı.
- **Otomatik tabindex** — `tabIndex="0"` veya `tabIndex="-1"` haricinde kullanma; pozitif tabindex tab sırasını bozar.

## Checklist (her yeni sayfa/component)

- [ ] Semantic HTML mi (`<button>`, `<nav>`, `<main>`, `<article>`)?
- [ ] Form input'larında `<label htmlFor>` veya `aria-label` var mı?
- [ ] Klavye ile (Tab/Enter/Escape/Arrow) tüm akış tamamlanıyor mu?
- [ ] Focus görünür mü (focus-visible ring)?
- [ ] İkon-only butonlarda `aria-label` var mı?
- [ ] Modal/Dialog için Radix mı yoksa focus trap var mı?
- [ ] Hata mesajları `role="alert"` mü, input'a `aria-describedby` ile bağlı mı?
- [ ] Renk kontrastı AA mı (4.5:1)?
- [ ] axe-core spec'ine bu sayfa eklendi mi?

Skill'ler: `react-component` (component pattern + Tailwind), `e2e-writer` (Playwright fixture'ları).
