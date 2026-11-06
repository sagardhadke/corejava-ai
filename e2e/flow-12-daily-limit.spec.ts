/**
 * E2E: Flow 12 — 5-Hour Daily Learning Limit & Locking
 * Tests 5h limit trigger, daily limit banner, locked lecture states,
 * and opening the exercises dialog.
 */

import { test, expect } from '@playwright/test';

test.describe('Flow 12 — 5-Hour Daily Limit & Content Locking', () => {
  test('locks content and shows daily limit banner when 5 hours learned today', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    await page.goto('/');

    // Seed 5 hours (18000 seconds) of learning in tracking store for today
    await page.evaluate(() => {
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      localStorage.setItem('jct_motivation_shown_v1', JSON.stringify({ date: today }));
      localStorage.setItem('jct_tracking__core-java-ai_v2', JSON.stringify({
        version: 'v2',
        dailyLog: {
          [today]: {
            totalSec: 18000,
            lectureCount: 5,
            limitReached: true,
            entries: [],
          },
        },
      }));
    });

    await page.reload();
    await page.waitForSelector('.section-card--open');

    // Daily limit banner should appear
    const banner = page.locator('.daily-limit-banner');
    await expect(banner).toBeVisible();
    await expect(page.getByText('Daily 5-Hour Learning Limit Reached')).toBeVisible();

    // Unwatched lectures should display locked pill/icons
    const lockedRows = page.locator('.lecture-row--locked');
    expect(await lockedRows.count()).toBeGreaterThan(0);

    // Clicking practical exercises opens DailyLimitDialog
    const exerciseBtn = banner.locator('.daily-limit-banner__action');
    await exerciseBtn.click();
    await page.waitForTimeout(300);

    const dialog = page.locator('.dlimit-card');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { level: 2 })).toBeVisible();

    // Close dialog
    await page.locator('.dlimit-card__close').click();
    await expect(dialog).not.toBeVisible();

    expect(errors).toHaveLength(0);
  });
});
