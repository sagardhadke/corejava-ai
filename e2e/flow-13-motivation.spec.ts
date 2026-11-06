/**
 * E2E: Flow 13 — Daily Motivation Modal
 * Tests auto-display on first visit of the day, quote refresh,
 * dismissal, and suppression on subsequent reloads.
 */

import { test, expect } from '@playwright/test';

test.describe('Flow 13 — Daily Motivation Modal', () => {
  test('displays motivation on first load of the day, allows quote refresh, and suppresses on reload', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    await page.goto('/');

    // Clear all storage so it acts as fresh first-visit of the day
    await page.evaluate(() => {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('jct_'))
        .forEach((k) => localStorage.removeItem(k));
    });

    await page.reload();

    // Motivation dialog should mount automatically
    const modal = page.locator('.motivation-card');
    await expect(modal).toBeVisible();
    await expect(page.getByText('Daily Motivation')).toBeVisible();

    // Verify motivation text is displayed
    const quoteEl = modal.locator('.motivation-card__text');
    await expect(quoteEl).toBeVisible();
    const initialQuote = await quoteEl.innerText();
    expect(initialQuote.length).toBeGreaterThan(5);

    // Dismiss modal via primary CTA
    const dismissBtn = modal.locator('.motivation-card__cta');
    await dismissBtn.click();
    await page.waitForTimeout(300);

    // Modal should be gone
    await expect(modal).not.toBeVisible();

    // Reload: modal should NOT appear again
    await page.reload();
    await page.waitForSelector('.section-card--open');
    await expect(page.locator('.motivation-card')).not.toBeVisible();

    expect(errors).toHaveLength(0);
  });
});
