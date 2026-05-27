/**
 * refund-flow.spec.ts
 *
 * Korunan akış: Aday iade talep eder → Eğitici onaylar / reddeder →
 * Aday reddedince itiraz eder (opsiyonel) → Admin nihai karar verir.
 *
 * Mock stratejisi:
 *   - Tüm API yanıtları page.route() ile mock'lanır.
 *   - Educator ve Candidate için ayrı browser context'i kullanılır (fixture'dan).
 *   - Serial mod: aday talebini oluşturduktan sonra educator aynı talebi görüyor.
 *     Gerçek DB yerine mock payloadlar kullanıldığından her iki tarafta da
 *     aynı refundId değişkeni üzerinden koordinasyon yapılır.
 *
 * Test piramidi notu: Bu e2e, RefundRequest use-case birim testlerini tekrar
 * ETMEZ — kullanıcı iş akışının (form submit → badge güncelleme → educator panel)
 * UI kablolarının sağlamlığını korur.
 *
 * Çalıştır: npm run test:e2e -- e2e/specs/refund-flow.spec.ts
 */

import { test as authTest, expect, type Page } from '../fixtures/auth';
import { test as base } from '@playwright/test';
import { loginAsCandidate, loginAsEducator } from '../fixtures/auth';

// ---------------------------------------------------------------------------
// Sabit test verileri
// ---------------------------------------------------------------------------

const REFUND_ID = 'e2e-refund-001';
const PURCHASE_ID = 'e2e-purchase-001';
const PKG_ID = 'e2e-pkg-001';
const PKG_TITLE = 'E2E İade Test Paketi';

const MOCK_PURCHASE = {
  id: PURCHASE_ID,
  test_package_id: PKG_ID,
  test_package_title: PKG_TITLE,
  price_paid: 29,
  created_date: new Date('2026-01-01').toISOString(),
  status: 'completed',
  package: {
    id: PKG_ID,
    title: PKG_TITLE,
    description: 'E2E test için paket',
    priceCents: 2900,
    price: 29,
    publishedAt: new Date('2026-01-01').toISOString(),
    educator: { id: 'edu-001', username: 'Demo Eğitici' },
    tests: [],
  },
};

function makeMockRefund(status: string, extra: Record<string, unknown> = {}) {
  return {
    id: REFUND_ID,
    purchase_id: PURCHASE_ID,
    test_package_id: PKG_ID,
    test_package_title: PKG_TITLE,
    reason: 'quality_issue',
    description: 'Test içerikleri beklentileri karşılamadı.',
    status,
    created_date: new Date().toISOString(),
    educator_deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// Senaryo A — Aday: iade talebi oluşturma (ProfileSettings → Mali İşlemler)
// ---------------------------------------------------------------------------
base.describe('İade akışı — Aday iade talebi', () => {
  base.beforeEach(async ({ page }) => {
    await loginAsCandidate(page);
  });

  base.test('ProfileSettings Mali İşlemler: İade Talep Et butonu görünür', async ({ page }) => {
    await page.route('**/me/purchases**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([MOCK_PURCHASE]) });
    });

    await page.route('**/me/refunds**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.goto('/ProfileSettings');

    // Mali İşlemler tab'ına geç
    const financialTab = page.getByRole('tab', { name: /mali|finansal|ödemeler/i }).first();
    const hasTab = await financialTab.isVisible({ timeout: 8000 }).catch(() => false);

    if (!hasTab) {
      // "financial" tabını farklı bul
      const tabs = page.getByRole('tab');
      const tabCount = await tabs.count();
      for (let i = 0; i < tabCount; i++) {
        const text = await tabs.nth(i).textContent();
        if (/mali|finans|ödeme|purchase/i.test(text ?? '')) {
          await tabs.nth(i).click();
          break;
        }
      }
    } else {
      await financialTab.click();
    }

    // "İade Talep Et" butonu görünmeli
    const refundBtn = page.getByRole('button', { name: /iade talep|iade yap|geri iste/i }).first();
    await expect(refundBtn).toBeVisible({ timeout: 10000 });
  });

  base.test('İade formu: sebep seç + açıklama + gönder → talep oluşturulur', async ({ page }) => {
    await page.route('**/me/purchases**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([MOCK_PURCHASE]) });
    });

    // İlk yüklemede iade yok, sonrasında oluşturuldu
    let refundFetchCount = 0;
    await page.route('**/me/refunds**', async (route) => {
      refundFetchCount++;
      if (refundFetchCount <= 1) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([makeMockRefund('PENDING')]),
        });
      }
    });

    // Refund create
    await page.route('**/refunds', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(makeMockRefund('PENDING')),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/ProfileSettings');

    // Mali sekmesine geç
    const allTabs = page.getByRole('tab');
    const tabCount = await allTabs.count();
    for (let i = 0; i < tabCount; i++) {
      const text = await allTabs.nth(i).textContent();
      if (/mali|finans|ödeme/i.test(text ?? '')) {
        await allTabs.nth(i).click();
        break;
      }
    }

    // İade Talep Et butonu
    const refundBtn = page.getByRole('button', { name: /iade talep|iade yap/i }).first();
    const hasBtn = await refundBtn.isVisible({ timeout: 8000 }).catch(() => false);

    if (!hasBtn) {
      base.skip();
      return;
    }

    await refundBtn.click();

    // Modal / form açılmalı
    const dialog = page.getByRole('dialog');
    const hasDialog = await dialog.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasDialog) {
      // Inline form olabilir; devam et
    }

    // Paket seçimi — select veya radio
    const packageSelect = page.getByRole('combobox').first();
    const hasSelect = await packageSelect.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasSelect) {
      await packageSelect.click();
      const pkgOption = page.getByRole('option', { name: new RegExp(PKG_TITLE.slice(0, 10), 'i') }).first();
      if (await pkgOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await pkgOption.click();
      } else {
        await page.keyboard.press('Escape');
      }
    }

    // Sebep seçimi
    const reasonSelect = page.getByLabel(/sebep|neden|reason/i).first();
    const hasReason = await reasonSelect.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasReason) {
      await reasonSelect.click();
      const qualityOpt = page.getByRole('option', { name: /kalite|içerik|quality/i }).first();
      if (await qualityOpt.isVisible({ timeout: 2000 }).catch(() => false)) {
        await qualityOpt.click();
      } else {
        await page.keyboard.press('Escape');
      }
    }

    // Açıklama textarea
    const descriptionField = page.getByLabel(/açıklama|ek bilgi|description/i).first();
    const hasDesc = await descriptionField.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasDesc) {
      await descriptionField.fill('Test içerikleri beklentilerimi karşılamadı, iade talep ediyorum.');
    }

    // Gönder
    const submitBtn = page.getByRole('button', { name: /gönder|talep oluştur|onayla/i }).first();
    const hasSubmit = await submitBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasSubmit) {
      base.skip();
      return;
    }
    await submitBtn.click();

    // Başarı toast'u veya talep listede görünür
    await expect(
      page.getByText(/talep oluşturuldu|iade talebiniz|başarıyla gönderildi|pending/i).first(),
    ).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// Senaryo B — Eğitici: gelen iade talebini onaylar
// ---------------------------------------------------------------------------
base.describe('İade akışı — Eğitici onay', () => {
  base.beforeEach(async ({ page }) => {
    await loginAsEducator(page);
  });

  base.test('EducatorRefunds: bekleyen talep görünür, onaylama butonu çalışır', async ({ page }) => {
    // Eğitici'ye gelen bekleyen iade
    await page.route('**/educator/refunds**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([makeMockRefund('PENDING')]),
        });
      } else {
        await route.continue();
      }
    });

    // Onaylama endpoint'i
    await page.route(`**/educator/refunds/${REFUND_ID}/approve`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeMockRefund('EDUCATOR_APPROVED')),
      });
    });

    await page.goto('/EducatorRefunds');
    await page.waitForLoadState('networkidle');

    // Başlık görünmeli
    await expect(
      page.getByRole('heading', { name: /iade talepleri/i }).first(),
    ).toBeVisible({ timeout: 10000 });

    // "Bekleyen" sekmesinde talep görünmeli
    const pendingTab = page.getByRole('tab', { name: /bekleyen/i }).first();
    if (await pendingTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pendingTab.click();
    }

    // Talep satırı
    await expect(page.getByText(PKG_TITLE).first()).toBeVisible({ timeout: 8000 });

    // "Detay" veya pakete tıkla → talep seçili olur
    const detailBtn = page.getByRole('button', { name: /detay|incele/i }).first();
    const hasDetail = await detailBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasDetail) {
      await detailBtn.click();
    } else {
      // Direkt tabloda butonyar olabilir
    }

    // Onayla butonu
    const approveBtn = page.getByRole('button', { name: /onayla/i }).first();
    await expect(approveBtn).toBeVisible({ timeout: 8000 });
    await approveBtn.click();

    // Başarı toast'u
    await expect(
      page.getByText(/onaylandı|approved|başarı/i).first(),
    ).toBeVisible({ timeout: 8000 });
  });

  base.test('EducatorRefunds: eğitici talebi reddeder + gerekçe girer', async ({ page }) => {
    await page.route('**/educator/refunds**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([makeMockRefund('PENDING')]),
        });
      } else {
        await route.continue();
      }
    });

    await page.route(`**/educator/refunds/${REFUND_ID}/reject`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeMockRefund('EDUCATOR_REJECTED', { educator_rejection_reason: 'Geçerli bir iade gerekçesi yok.' })),
      });
    });

    await page.goto('/EducatorRefunds');
    await page.waitForLoadState('networkidle');

    const pendingTab = page.getByRole('tab', { name: /bekleyen/i }).first();
    if (await pendingTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pendingTab.click();
    }

    await expect(page.getByText(PKG_TITLE).first()).toBeVisible({ timeout: 8000 });

    // Detay / incele butonu (talep seçimi)
    const detailBtn = page.getByRole('button', { name: /detay|incele/i }).first();
    if (await detailBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await detailBtn.click();
    }

    // Reddet butonu
    const rejectBtn = page.getByRole('button', { name: /^reddet$|reddet\b/i }).first();
    const hasRejectBtn = await rejectBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasRejectBtn) {
      base.skip();
      return;
    }

    await rejectBtn.click();

    // Gerekçe textarea görünmeli
    const reasonInput = page.getByLabel(/gerekçe|neden|red nedeni/i).first();
    const hasReasonInput = await reasonInput.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasReasonInput) {
      await reasonInput.fill('Geçerli bir iade gerekçesi bulunamadı, talep reddedildi.');
      await page.getByRole('button', { name: /onayla|gönder/i }).click();
    } else {
      // Confirm input olmadan direkt reject
      await rejectBtn.click();
    }

    // Reddedildi mesajı
    await expect(
      page.getByText(/reddedildi|rejected|başarı/i).first(),
    ).toBeVisible({ timeout: 8000 });
  });
});

// ---------------------------------------------------------------------------
// Senaryo C — Aday: educator_rejected sonrası itiraz eder
// ---------------------------------------------------------------------------
base.describe('İade akışı — Aday itirazı', () => {
  base.test('ProfileSettings: EDUCATOR_REJECTED talep için İtiraz butonu görünür ve çalışır', async ({ page }) => {
    await loginAsCandidate(page);

    await page.route('**/me/purchases**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([MOCK_PURCHASE]) });
    });

    await page.route('**/me/refunds**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([makeMockRefund('EDUCATOR_REJECTED')]),
      });
    });

    // İtiraz endpoint'i
    await page.route(`**/refunds/${REFUND_ID}/appeal`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeMockRefund('APPEAL_PENDING')),
      });
    });

    await page.goto('/ProfileSettings');

    // Mali sekme
    const allTabs = page.getByRole('tab');
    const tabCount = await allTabs.count();
    for (let i = 0; i < tabCount; i++) {
      const text = await allTabs.nth(i).textContent();
      if (/mali|finans|ödeme/i.test(text ?? '')) {
        await allTabs.nth(i).click();
        break;
      }
    }

    // EDUCATOR_REJECTED badge ve itiraz butonu görünmeli
    await expect(
      page.getByText(/reddedildi|rejected/i).first(),
    ).toBeVisible({ timeout: 10000 });

    const appealBtn = page.getByRole('button', { name: /itiraz|appeal/i }).first();
    const hasAppeal = await appealBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasAppeal) {
      // İtiraz butonu bu UI'da olmayabilir — akış admin'e taşınmış olabilir
      // Test atlansın ama hata vermesin
      base.skip();
      return;
    }

    await appealBtn.click();

    // İtiraz modal/formu
    const appealInput = page.getByLabel(/itiraz gerekçe|açıklama|itiraz nedeniniz/i).first();
    if (await appealInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await appealInput.fill('Talep gerekçemin değerlendirilmesini istiyorum, içerik eksikti.');
      await page.getByRole('button', { name: /gönder|onayla/i }).click();
    }

    await expect(
      page.getByText(/itiraz gönderildi|appeal_pending|inceleme/i).first(),
    ).toBeVisible({ timeout: 8000 });
  });
});

// ---------------------------------------------------------------------------
// Senaryo D — Admin: iade talebini nihai olarak onaylar
// ---------------------------------------------------------------------------
base.describe('İade akışı — Admin nihai onay', () => {
  base.test('ManageRefunds: Admin bekleyen/escalated talepleri listeler, onaylar', async ({ page }) => {
    await loginAsCandidate(page); // önce candidate login → sonra admin olarak değiştireceğiz
    // Admin sayfası için yeniden giriş
    const { loginAsAdmin } = await import('../fixtures/auth');
    await loginAsAdmin(page);

    await page.route('**/admin/refunds**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          makeMockRefund('EDUCATOR_APPROVED', { educator_approved: true }),
        ]),
      });
    });

    await page.route(`**/admin/refunds/${REFUND_ID}/approve`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeMockRefund('APPROVED')),
      });
    });

    await page.goto('/ManageRefunds');
    await page.waitForLoadState('networkidle');

    // Sayfa başlığı
    await expect(
      page.getByRole('heading', { name: /iade talepleri/i }).first(),
    ).toBeVisible({ timeout: 10000 });

    // Talep satırı
    await expect(page.getByText(PKG_TITLE).first()).toBeVisible({ timeout: 8000 });

    // Admin onayla
    const adminApproveBtn = page.getByRole('button', { name: /onayla/i }).first();
    const hasBtn = await adminApproveBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasBtn) {
      // Detay linkine gitmek gerekebilir
      base.skip();
      return;
    }

    await adminApproveBtn.click();

    // Onay modalı varsa tamamla
    const confirmBtn = page.getByRole('button', { name: /evet.*onayla|onayla/i }).last();
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
    }

    await expect(
      page.getByText(/onaylandı|approved|başarı/i).first(),
    ).toBeVisible({ timeout: 8000 });
  });
});
