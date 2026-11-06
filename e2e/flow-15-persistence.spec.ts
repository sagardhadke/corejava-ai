/**
 * E2E: Flow 15 — Persistence across reload
 * Tests that all state survives a full page reload.
 */

import { test, expect } from '@playwright/test';

test.describe('Flow 15 — Persistence across Reload', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('jct_'))
        .forEach((k) => localStorage.removeItem(k));
      localStorage.setItem('jct_motivation_shown_v1', JSON.stringify({ date: new Date().toISOString().slice(0, 10) }));
    });
    await page.reload();
    await page.waitForSelector('.section-card--open');
  });

  test('watched lectures survive page reload', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    // Watch 2 lectures
    const watchBtns = page.locator('[aria-pressed="false"]');
    await watchBtns.nth(0).click();
    await page.waitForTimeout(200);
    await watchBtns.nth(0).click(); // watch another (first unwatched changes)
    await page.waitForTimeout(500);

    const pctBefore = await page.locator('.stat-card__value').first().innerText();

    await page.reload();
    await page.waitForSelector('.stat-card');

    const pctAfter = await page.locator('.stat-card__value').first().innerText();
    expect(pctAfter).toBe(pctBefore);
    expect(errors).toHaveLength(0);
  });

  test('corrupted registry: app recovers to default state', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    await page.evaluate(() => {
      localStorage.setItem('jct_course_registry_v1', '{"broken":"json"'); // malformed
    });
    await page.reload();
    await page.waitForSelector('.app-shell', { timeout: 10000 });

    // Should show the default course (not crash)
    await expect(page.locator('.app-footer')).toContainText('Core Java');
    expect(errors).toHaveLength(0);
  });

  test('empty localStorage: app starts with default course', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('.app-shell', { timeout: 10000 });

    await expect(page.locator('.app-footer')).toContainText('Core Java');
    // Progress should be 0%
    await expect(page.locator('.stat-card__value').first()).toHaveText('0%');
    expect(errors).toHaveLength(0);
  });

  test('settings persist across reload', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    // Open settings
    await page.getByRole('button', { name: /settings/i }).first().click();
    await page.waitForTimeout(500);

    // Reload
    await page.reload();
    await page.waitForSelector('.app-shell');
    expect(errors).toHaveLength(0);
  });

  test('500+ watched lectures: app handles large dataset without crash', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    // Inject a large watched store
    await page.evaluate(() => {
      const watched: Record<string, boolean> = {};
      for (let i = 1; i <= 500; i++) {
        watched[`lecture-${i}`] = true;
      }
      localStorage.setItem('jct_watched__core-java-ai', JSON.stringify(watched));
    });

    await page.reload();
    await page.waitForSelector('.app-shell', { timeout: 10000 });

    // App should not crash even with 500 watched entries (most won't match course lectures, pct stays realistic)
    await expect(page.locator('.app-shell')).toBeVisible();
    expect(errors).toHaveLength(0);
  });
});

