/**
 * E2E: Flow 11 — Mobile Navigation
 * Tests mobile viewport bottom nav and mobile drawer.
 */

import { test, expect } from '@playwright/test';

test.describe('Flow 11 — Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 812 } });

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

  test('bottom nav is visible on mobile viewport', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    const bottomNav = page.locator('.mobile-bottom-nav');
    await expect(bottomNav).toBeVisible();

    // Bottom nav tabs
    await expect(bottomNav.getByRole('button', { name: /home/i })).toBeVisible();
    await expect(bottomNav.getByRole('button', { name: /today/i })).toBeVisible();
    await expect(bottomNav.getByRole('button', { name: /streak/i })).toBeVisible();
    await expect(bottomNav.getByRole('button', { name: /badges/i })).toBeVisible();
    await expect(bottomNav.getByRole('button', { name: /settings/i })).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('tapping settings tab on mobile opens Settings panel', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    const bottomNav = page.locator('.mobile-bottom-nav');
    await bottomNav.getByRole('button', { name: /settings/i }).click();
    await page.waitForTimeout(300);

    const drawer = page.locator('.drawer');
    await expect(drawer).toBeVisible();
    expect(errors).toHaveLength(0);
  });
});
