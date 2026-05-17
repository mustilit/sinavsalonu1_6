/**
 * a11y.spec.js — axe-core ile WCAG 2.1 AA erişilebilirlik testleri
 *
 * Kapsam: Backend çalışıyor olmalı (localhost:3000).
 * Sadece auth gerektirmeyen sayfalar burada test edilir.
 * Auth gerektiren sayfalar için smoke.spec.js'deki login fixture'ı kullanılabilir.
 *
 * Çalıştır: npm run test:e2e -- e2e/specs/a11y.spec.js
 */
import { test, expect } from '../fixtures/axe.js';

test.describe('A11y — public sayfalar', () => {
  test('Home ana sayfa', async ({ page, makeAxeBuilder }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await makeAxeBuilder().analyze();
    if (results.violations.length > 0) {
      console.log('Violations:', JSON.stringify(results.violations.map(v => ({
        id: v.id,
        description: v.description,
        nodes: v.nodes.length,
      })), null, 2));
    }
    expect(results.violations).toEqual([]);
  });

  test('Explore test listesi', async ({ page, makeAxeBuilder }) => {
    await page.goto('/Explore');
    await page.waitForLoadState('networkidle');

    const results = await makeAxeBuilder().analyze();
    if (results.violations.length > 0) {
      console.log('Violations:', JSON.stringify(results.violations.map(v => ({
        id: v.id,
        description: v.description,
        nodes: v.nodes.length,
      })), null, 2));
    }
    expect(results.violations).toEqual([]);
  });

  test('Login formu', async ({ page, makeAxeBuilder }) => {
    await page.goto('/Login');
    await page.waitForLoadState('networkidle');

    const results = await makeAxeBuilder().analyze();
    if (results.violations.length > 0) {
      console.log('Violations:', JSON.stringify(results.violations.map(v => ({
        id: v.id,
        description: v.description,
        nodes: v.nodes.length,
      })), null, 2));
    }
    expect(results.violations).toEqual([]);
  });

  test('Register formu', async ({ page, makeAxeBuilder }) => {
    await page.goto('/Register');
    await page.waitForLoadState('networkidle');

    const results = await makeAxeBuilder().analyze();
    if (results.violations.length > 0) {
      console.log('Violations:', JSON.stringify(results.violations.map(v => ({
        id: v.id,
        description: v.description,
        nodes: v.nodes.length,
      })), null, 2));
    }
    expect(results.violations).toEqual([]);
  });

  test('Educators listesi', async ({ page, makeAxeBuilder }) => {
    await page.goto('/Educators');
    await page.waitForLoadState('networkidle');

    const results = await makeAxeBuilder().analyze();
    if (results.violations.length > 0) {
      console.log('Violations:', JSON.stringify(results.violations.map(v => ({
        id: v.id,
        description: v.description,
        nodes: v.nodes.length,
      })), null, 2));
    }
    expect(results.violations).toEqual([]);
  });
});

test.describe('A11y — auth gerektiren sayfalar', () => {
  test.beforeEach(async ({ page }) => {
    // Demo aday hesabı ile giriş
    await page.goto('/Login');
    await page.getByPlaceholder(/ornek@email.com/i).fill('aday@demo.com');
    await page.locator('input[type="password"]').fill('demo123');
    await page.getByRole('button', { name: /giriş yap/i }).click();
    await page.waitForURL(/\/(Explore|Home)/, { timeout: 10000 });
  });

  test('MyTests sayfası', async ({ page, makeAxeBuilder }) => {
    await page.goto('/MyTests');
    await page.waitForLoadState('networkidle');

    const results = await makeAxeBuilder().analyze();
    if (results.violations.length > 0) {
      console.log('Violations:', JSON.stringify(results.violations.map(v => ({
        id: v.id,
        description: v.description,
        nodes: v.nodes.length,
      })), null, 2));
    }
    expect(results.violations).toEqual([]);
  });

  test('MyResults sayfası', async ({ page, makeAxeBuilder }) => {
    await page.goto('/MyResults');
    await page.waitForLoadState('networkidle');

    const results = await makeAxeBuilder().analyze();
    if (results.violations.length > 0) {
      console.log('Violations:', JSON.stringify(results.violations.map(v => ({
        id: v.id,
        description: v.description,
        nodes: v.nodes.length,
      })), null, 2));
    }
    expect(results.violations).toEqual([]);
  });
});
