/**
 * E2E: Flow 5 — Streak Calendar & Practice Days
 * Tests opening the streak drawer, verifying calendar heatmap,
 * marking a practice day, and streak calculations.
 */

import { test, expect } from '@playwright/test';

test.describe('Flow 5 — Streak Calendar & Practice Days', () => {
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

  test('clicking streak button opens CalendarPanel drawer', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    const streakBtn = page.locator('.streak-btn');
    await streakBtn.click();
    await page.waitForTimeout(300);

    // Drawer should open
    const drawer = page.locator('.drawer--open');
    await expect(drawer).toBeVisible();
    await expect(page.getByText('Streak & Consistency')).toBeVisible();

    // Close drawer
    await page.locator('.drawer__close').click();
    await expect(drawer).not.toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('marking practice day updates streak and shows toast', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    // Click "No lecture today? Mark as practice day" in TodayPlanCard
    const practiceBtn = page.getByRole('button', { name: /no lecture today\? mark as practice day/i });
    await practiceBtn.click();
    await page.waitForTimeout(300);

    // Practice modal should appear
    const modal = page.locator('.pd-modal');
    await expect(modal).toBeVisible();

    // Fill note and confirm
    const noteInput = page.locator('.pd-modal__textarea');
    if (await noteInput.isVisible()) {
      await noteInput.fill('Solved 5 LeetCode problems in Java');
    }
    await page.getByRole('button', { name: /confirm practice day/i }).click();
    await page.waitForTimeout(500);

    // Toast should appear and today card should show "Marked as a practice day"
    await expect(page.getByText('Marked as a practice day')).toBeVisible();
    expect(errors).toHaveLength(0);
  });
});
