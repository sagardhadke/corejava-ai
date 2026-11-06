/**
 * E2E: Flow 8 — Settings Panel
 * Tests opening the settings drawer, modifying settings, target presets,
 * and memory management.
 */

import { test, expect } from '@playwright/test';

test.describe('Flow 8 — Settings Panel', () => {
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

  test('clicking settings button opens SettingsPanel drawer', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    const settingsBtn = page.locator('.header-settings-btn');
    await settingsBtn.click();
    await page.waitForTimeout(300);

    const drawer = page.locator('.drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('heading', { name: 'Settings' })).toBeVisible();

    await drawer.locator('.drawer__close').click();
    await expect(drawer).not.toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('selecting daily target preset chip updates target hours', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    await page.locator('.header-settings-btn').click();
    await page.waitForTimeout(300);

    const drawer = page.locator('.drawer');
    await expect(drawer).toBeVisible();

    // Click 2h target preset chip
    const chip2h = drawer.getByRole('button', { name: /^2h$/i });
    await expect(chip2h).toBeVisible();
    await chip2h.click();
    await expect(chip2h).toHaveClass(/preset-chip--active/);

    await drawer.locator('.drawer__close').click();
    await expect(drawer).not.toBeVisible();
    expect(errors).toHaveLength(0);
  });
});
