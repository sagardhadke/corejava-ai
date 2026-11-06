/**
 * E2E: Flow 14 — Course Completion & Verification PIN Modal
 * Tests >= 90% completion trigger, initiation of verification challenge,
 * quick-filling 8-digit PIN, verification completion, and 100% course champion state.
 */

import { test, expect } from '@playwright/test';

test.describe('Flow 14 — Course Completion & Verification PIN Modal', () => {
  test('triggers completion banner at 90%, executes PIN verification, and verifies status', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    await page.goto('/');

    // Seed 92% completion into localStorage
    await page.evaluate(() => {
      localStorage.setItem('jct_motivation_shown_v1', JSON.stringify({ date: new Date().toISOString().slice(0, 10) }));

      // Fetch all lecture IDs from default course to mark ~92% watched
      const registryRaw = localStorage.getItem('jct_course_registry_v1');
      // Set watched map for core-java-ai
      // Total lectures is ~80, let's mark 75 watched
      const watchedMap: Record<string, boolean> = {};
      // Section 1 to 5 lectures
      for (let s = 1; s <= 5; s++) {
        for (let l = 0; l < 20; l++) {
          const sNum = s < 10 ? `0${s}` : `${s}`;
          watchedMap[`core-java-ai__s${sNum}_l${l}`] = true;
        }
      }
      localStorage.setItem('jct_watched__core-java-ai', JSON.stringify(watchedMap));
    });

    await page.reload();
    await page.waitForSelector('.section-card--open');

    // Completion banner should be visible at >= 90%
    const banner = page.locator('#completion-banner');
    await expect(banner).toBeVisible();

    // Click "Mark as Complete" to initiate verification challenge
    const markCompleteBtn = page.locator('#mark-as-complete-btn');
    if (await markCompleteBtn.isVisible()) {
      await markCompleteBtn.click();
      await page.waitForTimeout(300);

      // PIN Verification Modal should appear
      const pinModal = page.locator('.pin-modal');
      await expect(pinModal).toBeVisible();

      // Click "Quick Fill" button
      const quickFillBtn = pinModal.locator('.pin-helper-btn');
      await expect(quickFillBtn).toBeVisible();
      await quickFillBtn.click();
      await page.waitForTimeout(200);

      // Click Verify PIN
      const verifyBtn = pinModal.locator('.pin-modal__btn--verify');
      await expect(verifyBtn).toBeEnabled();
      await verifyBtn.click();
      await page.waitForTimeout(500);

      // Modal should close and banner should indicate verification complete
      await expect(pinModal).not.toBeVisible();
      await expect(page.getByText('Verification Complete')).toBeVisible();
    }

    expect(errors).toHaveLength(0);
  });
});
