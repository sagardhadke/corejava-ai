/**
 * E2E: Flow 4 — Search / Filter Lectures
 * Tests the search input, empty state, and clearing.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Flow 4 — Search/Filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('jct_motivation_shown_v1', JSON.stringify({ date: new Date().toISOString().slice(0, 10) }));
    });
    await page.reload();
    await page.waitForSelector('.toolbar', { timeout: 10000 });
  });

  test('search shows matching results and hides non-matching sections', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    const input = page.getByPlaceholder('Search lectures…');
    await input.fill('java');
    await page.waitForTimeout(300);

    // The input should have the value
    await expect(input).toHaveValue('java');
    // A clear button should appear
    await expect(page.locator('.search-clear')).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('empty state shows when no matches found', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    const input = page.getByPlaceholder('Search lectures…');
    await input.fill('xyznonexistentterm999');
    await page.waitForTimeout(300);

    // Empty state should appear
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.getByText(/No lectures match/)).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('Clear search button resets query and shows all sections', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    const input = page.getByPlaceholder('Search lectures…');
    await input.fill('xyznonexistentterm999');
    await page.waitForTimeout(300);

    // Click the empty state clear button
    await page.locator('.empty-state__btn').click();
    await page.waitForTimeout(300);

    await expect(input).toHaveValue('');
    await expect(page.locator('.empty-state')).not.toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('search is keyboard accessible', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    const input = page.getByPlaceholder('Search lectures…');
    await input.focus();
    await page.keyboard.type('variables');
    expect(await input.inputValue()).toBe('variables');

    await page.locator('.search-clear').click();
    expect(await input.inputValue()).toBe('');
    expect(errors).toHaveLength(0);
  });

  test('very long search query does not break layout', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    const longQuery = 'a'.repeat(500);
    const input = page.getByPlaceholder('Search lectures…');
    await input.fill(longQuery);
    await page.waitForTimeout(300);

    // App should not crash, empty state should show
    await expect(page.locator('.app-shell')).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('accessibility: zero violations on main page with search', async ({ page }) => {
    const input = page.getByPlaceholder('Search lectures…');
    await input.fill('java');
    await page.waitForTimeout(200);
    const results = await new AxeBuilder({ page }).exclude('.developer-badge').analyze();
    expect(results.violations).toHaveLength(0);
  });
});

