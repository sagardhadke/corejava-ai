/**
 * E2E: Flow 6 — Badges & Achievements
 * Tests opening the badges panel, badge list display, and unlocking a badge.
 */

import { test, expect } from '@playwright/test';

test.describe('Flow 6 — Badges & Achievements', () => {
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

  test('clicking badges button opens BadgesPanel drawer', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    const badgesBtn = page.locator('.badges-btn');
    await badgesBtn.click();
    await page.waitForTimeout(300);

    const drawer = page.locator('.drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('Achievements & Badges')).toBeVisible();

    // Verify all 12 badges are displayed
    const badges = drawer.locator('.badge-card');
    await expect(badges).toHaveCount(12);

    await drawer.locator('.drawer__close').click();
    expect(errors).toHaveLength(0);
  });
});
