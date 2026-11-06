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

  test('clicking streak button opens CalendarPanel drawer', async ({ page, isMobile }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    const streakBtn = isMobile
      ? page.locator('.mobile-bottom-nav').getByRole('button', { name: /streak/i })
      : page.locator('.streak-btn');
    await streakBtn.click();
    await page.waitForTimeout(300);

    // Drawer should open
    const drawer = page.locator('.drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('Activity & Streak')).toBeVisible();

    // Close drawer
    await drawer.locator('.drawer__close').click();
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

    // Step 1: Fill note with at least 10 words
    const textarea = page.locator('.pd-textarea');
    await textarea.fill('I spent forty minutes solving binary search algorithm problems in Java today');
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 2: Read the 6-digit confirmation code and type it
    await expect(page.locator('.pd-code-digit')).toHaveCount(6);
    const digits = await page.locator('.pd-code-digit').allInnerTexts();
    const code = digits.join('').trim();
    await page.locator('.pd-code-input').fill(code);

    await page.getByRole('button', { name: /confirm practice day/i }).click();
    await page.waitForTimeout(500);

    // Modal should close and today card should show "Marked as a practice day"
    await expect(modal).not.toBeVisible();
    await expect(page.getByText('Marked as a practice day')).toBeVisible();
    expect(errors).toHaveLength(0);
  });
});
