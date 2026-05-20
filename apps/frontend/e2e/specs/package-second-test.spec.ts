/**
 * package-second-test.spec.ts
 *
 * Regression: TestPackage içinde 2 test olduğunda, kullanıcı 2. teste
 * cevap işaretleyip kaydet/çıkış yaptığında:
 *  - Cevap kaydedilmeli (sunucuda mevcut olmalı)
 *  - Geri döndüğünde işaretli seçenek hâlâ seçili olmalı
 *  - 2. testin durumu "in progress" (devam ediliyor) olarak görünmeli
 *
 * Kök neden: dalClient.Purchase.filter, paket içindeki herhangi bir
 * ExamTest sorulduğunda paketin satın alma satırını döndürür. O satırın
 * `attempt` alanı paketin BİRİNCİ testinin attempt'ına işaret eder.
 * TakeTest bu yanlış attempt'ı kullanır → cevap yanlış attempt'a gönderilir
 * → backend QUESTION_NOT_IN_TEST 400 → kayıt kaybolur.
 */
import { test, expect } from '../fixtures/auth';

const PACKAGE_TITLE = /KPSS ÖABT Genel Tekrar/i;
const SECOND_TEST_NAME = /ÖABT Deneme 2/i;

test.describe('Paket içindeki ikinci test — cevap kaydı', () => {
  test('İkinci test cevabı kaydedilir ve dönüşte hâlâ seçili kalır', async ({ candidatePage }) => {
    const page = candidatePage;

    // 1) MyTests sayfası: ÖABT paketini bul
    await page.goto('/MyTests');
    await expect(page.getByText(PACKAGE_TITLE).first()).toBeVisible({ timeout: 15000 });

    // Paket detayına git
    await page.getByText(PACKAGE_TITLE).first().click();
    await page.waitForURL(/TestDetail/, { timeout: 10000 });

    // 2) Sidebar "Testler" panelinde Deneme 2 düğmesini bul ve tıkla
    const denme2Btn = page.getByRole('link', { name: SECOND_TEST_NAME }).first();
    await expect(denme2Btn).toBeVisible({ timeout: 10000 });
    await denme2Btn.click();

    await page.waitForURL(/TakeTest/, { timeout: 10000 });

    // Cookie banner'ı kapat (alt köşede)
    const cookieBtn = page.getByRole('button', { name: /sadece zorunlu|kabul et/i }).first();
    if (await cookieBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await cookieBtn.click().catch(() => {});
      await page.waitForTimeout(300);
    }

    // Onboarding tour modal'ı varsa "Atla" ile kapat
    for (let i = 0; i < 6; i++) {
      const skip = page.getByRole('button', { name: /^atla$/i }).first();
      const close = page.locator('[role="dialog"] button, .fixed.inset-0 > div > button').filter({ hasText: /^×$|^x$|kapat/i }).first();
      if (await skip.isVisible({ timeout: 500 }).catch(() => false)) {
        await skip.click({ force: true }).catch(() => {});
        await page.waitForTimeout(400);
        break;
      } else if (await close.isVisible({ timeout: 500 }).catch(() => false)) {
        await close.click({ force: true }).catch(() => {});
        await page.waitForTimeout(400);
      } else {
        break;
      }
    }

    // 3) "Teste Başla" / "Sınava Başla" ekranı: butona tıkla
    const startBtn = page.getByRole('button', { name: /teste başla|sınava başla/i }).first();
    if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(1500);
    }

    // 4) İlk seçeneği seç — opsiyon butonları "w-full p-4 rounded-xl border-2" sınıfını taşır
    const optionButtons = page.locator('button.w-full.p-4.rounded-xl.border-2');
    await expect(optionButtons.first()).toBeVisible({ timeout: 10000 });
    const optCount = await optionButtons.count();
    expect(optCount).toBeGreaterThanOrEqual(2);
    await optionButtons.first().click();

    // Seçim UI'da işaretlensin (border-indigo-600 sınıfı) — bekleme
    await expect(optionButtons.first()).toHaveClass(/border-indigo-600/, { timeout: 5000 });

    // API submitAnswer için kısa süre
    await page.waitForTimeout(1500);

    // 6) Kaydet ve Çık
    const saveExitBtn = page.getByRole('button', { name: /kaydet ve çık/i });
    await expect(saveExitBtn).toBeVisible({ timeout: 5000 });
    await saveExitBtn.click();

    // MyTests veya başka sayfaya yönlendir
    await page.waitForURL((u) => !u.pathname.includes('TakeTest'), { timeout: 8000 });

    // 7) Paket detayına geri dön
    await page.goto('/MyTests');
    await page.getByText(PACKAGE_TITLE).first().click();
    await page.waitForURL(/TestDetail/, { timeout: 10000 });

    // 8) Deneme 2 düğmesi artık IN_PROGRESS rengindeyse OK (amber #f59e0b)
    const denme2BtnAfter = page.getByRole('link', { name: SECOND_TEST_NAME }).first();
    await expect(denme2BtnAfter).toBeVisible({ timeout: 5000 });
    // Buton içindeki <button> "Devam Et" rengini (amber #f59e0b) almalı —
    // not-started indigo (#0000CD) olmaz
    const denme2InnerBtn = denme2BtnAfter.locator('button').first();
    const bg = await denme2InnerBtn.evaluate((el) => el.style.backgroundColor);
    expect(bg).toContain('245, 158, 11'); // rgb(245, 158, 11) = #f59e0b

    // 9) Deneme 2'ye tekrar gir — seçenek hâlâ seçili olmalı
    await denme2BtnAfter.click();
    await page.waitForURL(/TakeTest/, { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Onboarding tour (zaten görülmüş olabilir ama yine atla)
    for (let i = 0; i < 4; i++) {
      const skip = page.getByRole('button', { name: /^atla$/i }).first();
      if (await skip.isVisible({ timeout: 400 }).catch(() => false)) {
        await skip.click({ force: true }).catch(() => {});
        await page.waitForTimeout(300);
      } else break;
    }

    // Eğer "Teste Başla" hâlâ görünüyorsa tıkla (devam etme idempotent)
    const startAgain = page.getByRole('button', { name: /teste başla|sınava başla|teste devam|sınava devam|devam et/i }).first();
    if (await startAgain.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startAgain.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1500);
    }

    await page.screenshot({ path: 'test-results/second-entry.png', fullPage: false }).catch(() => {});

    // İlk şık border-indigo-600 olmalı (yani önceki seçim kalıcı)
    const optionsAfter = page.locator('button.w-full.p-4.rounded-xl.border-2');
    await expect(optionsAfter.first()).toBeVisible({ timeout: 10000 });
    await expect(optionsAfter.first()).toHaveClass(/border-indigo-600/, { timeout: 8000 });
  });
});
