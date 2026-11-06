/**
 * E2E: Flow 2 — Mark Lecture Watched / Unwatched
 * Tests the core watched-toggle flow including state persistence and daily limit.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Flow 2 — Mark Lecture Watched/Unwatched', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Reset to fresh state but mark motivation as shown for testing
    await page.evaluate(() => {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('jct_'))
        .forEach((k) => localStorage.removeItem(k));
      localStorage.setItem('jct_motivation_shown_v1', JSON.stringify({ date: new Date().toISOString().slice(0, 10) }));
    });
    await page.reload();
    await page.waitForSelector('.section-card--open');
  });

  test('marking a lecture as watched updates progress percentage', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    // Get initial progress
    const initialPct = await page.locator('.stat-card__value').first().innerText();

    // Click the first watch button
    const firstWatchBtn = page.locator('[aria-pressed="false"]').first();
    await firstWatchBtn.click();
    await page.waitForTimeout(300);

    // Progress should have increased
    const newPct = await page.locator('.stat-card__value').first().innerText();
    expect(newPct).not.toBe(initialPct);
    expect(errors).toHaveLength(0);
  });

  test('marking a watched lecture un-watches it and shows aria-pressed=false', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    // Watch a lecture
    const watchBtn = page.locator('[aria-pressed="false"]').first();
    await watchBtn.click();
    await page.waitForTimeout(300);

    // Now un-watch it — the button should now say "not watched" in label
    const watchedBtn = page.locator('[aria-pressed="true"]').first();
    await expect(watchedBtn).toBeVisible();
    await watchedBtn.click();
    await page.waitForTimeout(300);

    // Should be back to unwatched
    await expect(page.locator('[aria-pressed="true"]')).toHaveCount(0);
    expect(errors).toHaveLength(0);
  });

  test('watched state persists across page reload', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    await page.locator('[aria-pressed="false"]').first().click();
    await page.waitForTimeout(500);

    await page.reload();
    await page.waitForSelector('.section-card--open');

    // Should still have at least 1 watched lecture after reload
    const watchedBtn = page.locator('[aria-pressed="true"]');
    await expect(watchedBtn.first()).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('COMPLETED pill appears after marking a lecture watched', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    await page.locator('[aria-pressed="false"]').first().click();
    await page.waitForTimeout(300);
    await expect(page.getByText('COMPLETED').first()).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('corrupted watched localStorage: app recovers gracefully', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    // Inject invalid JSON into watched store
    await page.evaluate(() => {
      localStorage.setItem('jct_watched__core-java-ai', 'INVALID_JSON{{{');
    });
    await page.reload();
    await page.waitForSelector('.app-shell', { timeout: 10000 });

    // App should still render, not crash
    await expect(page.locator('.stat-card__value').first()).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('accessibility: zero violations', async ({ page }) => {
    await page.waitForSelector('.section-card--open');
    const results = await new AxeBuilder({ page }).exclude('.developer-badge').analyze();
    expect(results.violations).toHaveLength(0);
  });
});

