/**
 * axe.js — @axe-core/playwright fixture
 *
 * Kullanım:
 *   import { test, expect } from '../fixtures/axe.js';
 *
 *   test('a11y', async ({ page, makeAxeBuilder }) => {
 *     await page.goto('/');
 *     const results = await makeAxeBuilder().analyze();
 *     expect(results.violations).toEqual([]);
 *   });
 */
import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export const test = base.extend({
  makeAxeBuilder: async ({ page }, use) => {
    const builder = () =>
      new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        // Üçüncü taraf iframe'ler (örn. ödeme provider) hariç
        .exclude('iframe[src*="iyzico"]')
        .exclude('iframe[src*="stripe.com"]');
    await use(builder);
  },
});

export { expect };
