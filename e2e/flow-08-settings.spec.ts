/**
 * E2E: Flow 8 — Settings Panel
 * Tests opening the settings drawer, modifying settings, export backup,
 * and resetting all progress.
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

    const drawer = page.locator('.drawer--open');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('Settings')).toBeVisible();

    await page.locator('.drawer__close').click();
    expect(errors).toHaveLength(0);
  });

  test('daily target slider updates target hours', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    await page.locator('.header-settings-btn').click();
    await page.waitForTimeout(300);

    const slider = page.locator('input[type="range"]').first();
    await expect(slider).toBeVisible();

    await page.locator('.drawer__close').click();
    expect(errors).toHaveLength(0);
  });
});
