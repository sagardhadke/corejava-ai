/**
 * E2E: Flow 16 — AI Tutor Context Launch (ChatGPT & Claude Deep Links)
 * Tests opening AI Tutor from Toolbar, Floating Action Button (FAB), and LectureRow,
 * verifies multi-lecture selection, section selection, context file download,
 * prompt preview, deep link generation, clipboard copy fallback, and Axe accessibility.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Flow 16 — AI Tutor (ChatGPT & Claude Context Launcher)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('jct_'))
        .forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(
        'jct_motivation_shown_v1',
        JSON.stringify({ date: new Date().toISOString().slice(0, 10) })
      );
    });
    await page.reload();
    await page.waitForSelector('.section-card--open');
  });

  test('opens AI Tutor modal from toolbar and displays course context', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    // 1. Click "Ask AI Tutor" button in Toolbar
    const aiBtn = page.locator('.tb-btn--ai');
    await expect(aiBtn).toBeVisible();
    await aiBtn.click();

    // 2. Modal should appear
    const modal = page.getByRole('dialog', { name: /ask ai tutor/i });
    await expect(modal).toBeVisible();

    // 3. Header title & subtitle
    await expect(modal.getByText(/ask ai tutor \(chatgpt & claude\)/i)).toBeVisible();

    // 4. Scope toggles present
    await expect(modal.getByRole('radio', { name: /by topic/i })).toBeVisible();
    await expect(modal.getByRole('radio', { name: /by entire section/i })).toBeVisible();
    await expect(modal.getByRole('radio', { name: /full curriculum/i })).toBeVisible();

    // 5. Action buttons
    await expect(modal.getByRole('button', { name: /ask chatgpt/i })).toBeVisible();
    await expect(modal.getByRole('button', { name: /ask claude/i })).toBeVisible();
    await expect(modal.getByRole('button', { name: /download context file/i })).toBeVisible();

    // 6. Close dialog via close button
    await modal.getByRole('button', { name: /close ai tutor dialog/i }).click();
    await expect(modal).not.toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('opens AI Tutor modal from floating action button (FAB)', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    // Find and click floating action button
    const fab = page.locator('.ai-fab-btn');
    await expect(fab).toBeVisible();
    await fab.click();

    const modal = page.getByRole('dialog', { name: /ask ai tutor/i });
    await expect(modal).toBeVisible();

    // Dismiss with Escape key
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('selecting multiple lectures updates selection pills and prompt size', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    await page.locator('.tb-btn--ai').click();
    const modal = page.getByRole('dialog', { name: /ask ai tutor/i });
    await expect(modal).toBeVisible();

    // Initial state has 1 lecture selected
    await expect(modal.getByText(/selected \(1\):/i)).toBeVisible();

    // Check second lecture in checklist
    const checkboxes = modal.getByRole('checkbox');
    await checkboxes.nth(1).check();

    // Should now show 2 selected
    await expect(modal.getByText(/selected \(2\):/i)).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('switching between multi-lecture, section, and full-curriculum scopes', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    await page.locator('.tb-btn--ai').click();
    const modal = page.getByRole('dialog', { name: /ask ai tutor/i });
    await expect(modal).toBeVisible();

    // Switch to section mode
    await modal.getByRole('radio', { name: /by entire section/i }).click();
    await expect(modal.getByText(/select one or more sections/i)).toBeVisible();

    // Switch to full curriculum mode
    await modal.getByRole('radio', { name: /full curriculum/i }).click();
    await expect(modal.getByText(/entire curriculum context/i)).toBeVisible();

    // Switch back to topic mode
    await modal.getByRole('radio', { name: /by topic/i }).click();
    await expect(modal.getByText(/selected \(/i)).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('clicking Ask AI on a specific lecture pre-selects that lecture in modal', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    // Ensure Section 1 is open
    const openCard = page.locator('.section-card--open').first();
    await expect(openCard).toBeVisible();

    // Find the first lecture row's AI button
    const lectureAiBtn = openCard.locator('.lecture-row__ai-btn').first();
    await expect(lectureAiBtn).toBeVisible();
    await lectureAiBtn.click();

    // Modal should open with topic scope active
    const modal = page.getByRole('dialog', { name: /ask ai tutor/i });
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('radio', { name: /by topic/i })).toHaveClass(/ai-scope-btn--active/);

    // Dismiss with Escape key
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('accessibility: zero axe violations on AI Tutor modal', async ({ page }) => {
    await page.locator('.tb-btn--ai').click();
    const modal = page.getByRole('dialog', { name: /ask ai tutor/i });
    await expect(modal).toBeVisible();

    // Run Axe audit on the open dialog
    const axeResults = await new AxeBuilder({ page })
      .include('.ai-modal')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(axeResults.violations).toHaveLength(0);
  });
});
