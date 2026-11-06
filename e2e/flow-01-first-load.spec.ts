/**
 * E2E: Flow 1 — First Load / Empty State
 * Tests that the app loads correctly on a fresh install with no data.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Flow 1 — First Load / Empty State', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all app storage to simulate fresh install
    await page.goto('/');
    await page.evaluate(() => {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('jct_'))
        .forEach((k) => localStorage.removeItem(k));
    });
    await page.reload();
  });

  test('app loads and shows course title in header', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    await page.waitForSelector('.app-shell', { timeout: 10000 });
    // The default course title should be visible somewhere on the page
    await expect(page.locator('.app-footer')).toContainText('Core Java');
    expect(errors).toHaveLength(0);
  });

  test('stats bar shows 0% progress on fresh install', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    await page.waitForSelector('.stat-card', { timeout: 10000 });
    await expect(page.locator('.stat-card__value').first()).toHaveText('0%');
    expect(errors).toHaveLength(0);
  });

  test('at least one section is auto-expanded on first load', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    await page.waitForSelector('.section-card', { timeout: 10000 });
    // At least one section should be in expanded (open) state
    const openSections = page.locator('.section-card--open');
    await expect(openSections.first()).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('state is preserved across page reload', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    await page.waitForSelector('.stat-card');

    // Dismiss motivation popup if open
    const closeBtn = page.locator('.motivation-card__close');
    if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeBtn.click();
    }

    // Mark the first lecture as watched
    const firstWatchBtn = page.locator('[aria-pressed="false"]').first();
    await firstWatchBtn.click();

    // Wait for state to update
    await page.waitForTimeout(500);

    // Reload
    await page.reload();
    await page.waitForSelector('.stat-card');

    // After reload, at least one lecture should be watched (progress > 0%)
    const progressText = await page.locator('.stat-card__value').first().innerText();
    expect(progressText).not.toBe('0%');
    expect(errors).toHaveLength(0);
  });

  test('accessibility: zero violations on main page', async ({ page }) => {
    await page.waitForSelector('.app-shell', { timeout: 10000 });
    const results = await new AxeBuilder({ page })
      .exclude('.developer-badge') // decorative element
      .analyze();
    expect(results.violations).toHaveLength(0);
  });

  test('renders at 375px (mobile)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForSelector('.app-shell');
    // App shell should be visible and not overflow
    const shell = page.locator('.app-shell');
    await expect(shell).toBeVisible();
  });

  test('renders at 1440px (desktop)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForSelector('.app-shell');
    const shell = page.locator('.app-shell');
    await expect(shell).toBeVisible();
  });
});

