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
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem('jct_motivation_shown_v1', JSON.stringify({ date: today }));
      localStorage.setItem('jct_tracking_v1', JSON.stringify({
        sessions: [
          {
            id: 'mock-session-1',
            date: today,
            courseId: 'core-java-ai',
            lectureId: 'core-java-ai__s01_l0',
            durationSec: 18000,
            type: 'lecture',
            timestamp: new Date().toISOString(),
          },
        ],
        dailyLog: {
          [today]: {
            learnedSec: 18000,
            lectureCount: 5,
            sessions: [],
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
    await expect(page.getByText('Daily Learning Limit')).toBeVisible();

    // Close dialog
    await page.locator('.dlimit-card__close').click();
    await expect(dialog).not.toBeVisible();

    expect(errors).toHaveLength(0);
  });
});
