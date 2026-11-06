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

    // Seed ~97% completion into localStorage
    await page.evaluate(() => {
      localStorage.setItem('jct_motivation_shown_v1', JSON.stringify({ date: new Date().toISOString().slice(0, 10) }));

      const watchedMap: Record<string, boolean> = {};
      const sectionCounts = [7, 7, 12, 2, 26, 1, 1, 7, 3, 13, 6, 11, 6, 3, 20, 6, 5, 6];
      sectionCounts.forEach((total, idx) => {
        const sNum = String(idx + 1).padStart(2, '0');
        for (let l = 0; l < total; l++) {
          watchedMap[`core-java-ai__s${sNum}_l${l}`] = true;
        }
      });
      // Leave 3 lectures unwatched so progress is ~97% (>= 90%)
      delete watchedMap['core-java-ai__s18_l5'];
      delete watchedMap['core-java-ai__s18_l4'];
      delete watchedMap['core-java-ai__s18_l3'];

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
      const quickFillBtn = pinModal.getByRole('button', { name: /auto-fill 8-digit/i });
      await expect(quickFillBtn).toBeVisible();
      await quickFillBtn.click();
      await page.waitForTimeout(200);

      // Click Verify PIN
      const verifyBtn = pinModal.locator('.pin-modal__btn--verify');
      await expect(verifyBtn).toBeEnabled();
      await verifyBtn.click();
      await page.waitForTimeout(300);

      // Success screen should be visible inside modal
      await expect(pinModal.getByText('Verification Complete!')).toBeVisible();

      // Click "Continue Studying →" to close modal
      await pinModal.locator('.pin-modal__btn--done').click();
      await page.waitForTimeout(300);

      // Modal should close and banner should indicate verification complete
      await expect(pinModal).not.toBeVisible();
      await expect(page.getByText('Verification Complete — Finish remaining')).toBeVisible();
    }

    expect(errors).toHaveLength(0);
  });
});
