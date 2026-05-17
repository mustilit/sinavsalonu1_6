/**
 * E2E smoke: login → home → marketplace (Explore) → test detail
 * Backend çalışıyor olmalı (localhost:3000)
 */
import { test, expect } from '@playwright/test';

test.describe('Smoke E2E', () => {
  test('login → home → Explore → test detail açılır', async ({ page }) => {
    await page.goto('/');

    // Ana sayfa açıldı
    await expect(page).toHaveURL(/\//);

    // Explore'a git
    await page.goto('/Explore');
    await expect(page).toHaveURL(/\/Explore/);

    // Login
    await page.goto('/Login');
    await expect(page.getByRole('heading', { name: /giriş yap/i })).toBeVisible();

    await page.getByPlaceholder(/ornek@email.com/i).fill('aday@demo.com');
    await page.locator('input[type=\"password\"]').fill('demo123');
    await page.getByRole('button', { name: /giriş yap/i }).click();

    // Giriş sonrası yönlendirme (Explore veya Home)
    await expect(page).toHaveURL(/\/(Explore|Home)/, { timeout: 10000 });

    // Marketplace (Explore) test listesi
    await page.goto('/Explore');
    await expect(page).toHaveURL(/\/Explore/);

    // İlk test varsa tıkla - yoksa test geçer (boş liste)
    const testLink = page.locator('a[href*="/TestDetail"]').first();
    if (await testLink.count() > 0) {
      await testLink.click();
      await expect(page).toHaveURL(/\/TestDetail/);
    }
  });
});
