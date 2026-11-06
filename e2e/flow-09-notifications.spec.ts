/**
 * E2E: Flow 9 — Notification Center & Alerts
 * Tests opening notifications drawer, sending test alert, reading and clearing notifications.
 */

import { test, expect } from '@playwright/test';

test.describe('Flow 9 — Notification Center & Alerts', () => {
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

  test('opens Notification Center and can send and clear a test notification', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    // Open notification center
    const notifBtn = page.locator('.notif-btn');
    await notifBtn.click();
    await page.waitForTimeout(300);

    const drawer = page.locator('.notif-drawer-root');
    await expect(drawer).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Notification Center' })).toBeVisible();

    // Click "Test Alert 🔔" button
    const testBtn = page.getByRole('button', { name: /send test push notification/i });
    await expect(testBtn).toBeVisible();
    await testBtn.click();
    await page.waitForTimeout(300);

    // Notification item should now be in the list
    const items = drawer.locator('.notif-item');
    await expect(items.first()).toBeVisible();

    // Clear notifications
    const clearBtn = page.getByRole('button', { name: /clear all notifications/i });
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await page.waitForTimeout(300);
      await expect(page.getByText('No notifications yet')).toBeVisible();
    }

    // Close drawer
    await page.getByRole('button', { name: /close notification center/i }).click();
    await expect(drawer).not.toBeVisible();

    expect(errors).toHaveLength(0);
  });
});
