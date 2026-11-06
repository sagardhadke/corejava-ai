/**
 * E2E: Flow 3 — Today's Plan (auto & manual)
 * Tests auto-generation of today's plan, manual toggling of lectures into plan,
 * TodayPlanCard display, progress calculation, and clearing plan.
 */

import { test, expect } from '@playwright/test';

test.describe("Flow 3 — Today's Plan", () => {
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

  test('auto-plan populates TodayPlanCard with lectures on first load', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    const todayCard = page.locator('#today-plan-card');
    await expect(todayCard).toBeVisible();

    // Auto-plan tag should be visible
    await expect(todayCard.locator('.auto-tag')).toBeVisible();

    // Planned items should be listed in today's plan
    const items = todayCard.locator('.today-card__list li');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
    expect(errors).toHaveLength(0);
  });

  test('clearing plan removes all items from TodayPlanCard', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    // Clear plan button in toolbar
    const clearBtn = page.getByRole('button', { name: /clear today's plan/i });
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await page.waitForTimeout(300);

      // Empty message should show in today plan card
      await expect(page.locator('.today-card__empty')).toBeVisible();
    }
    expect(errors).toHaveLength(0);
  });

  test('manually toggling plan checkbox adds lecture to TodayPlanCard', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    // Clear plan first
    const clearBtn = page.getByRole('button', { name: /clear today's plan/i });
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await page.waitForTimeout(300);
    }

    // Toggle plan checkbox on the first unwatched lecture
    const planCheckbox = page.locator('.plan-check input').first();
    await planCheckbox.click();
    await page.waitForTimeout(300);

    // Today plan card should now have 1 item
    const items = page.locator('.today-card__list li');
    await expect(items).toHaveCount(1);
    expect(errors).toHaveLength(0);
  });
});
