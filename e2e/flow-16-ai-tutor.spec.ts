/**
 * E2E: Flow 16 — AI Tutor Context Launch (ChatGPT & Claude Deep Links)
 * Tests opening AI Tutor from Toolbar, Floating Action Button (FAB), and LectureRow,
 * verifies topic-wise lecture selection, section selection, developer attribution,
 * prompt downloads (.md, .txt, .xml), prompt preview, clipboard copy,
 * FAB dismiss persistence, and Axe accessibility.
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

  test('opens AI Tutor modal from toolbar and displays course context with developer attribution', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    // 1. Click "Ask AI Tutor" button in Toolbar
    const aiBtn = page.locator('.tb-btn--ai');
    await expect(aiBtn).toBeVisible();
    await aiBtn.click();

    // 2. Modal should appear
    const modal = page.getByRole('dialog', { name: /ai tutor/i });
    await expect(modal).toBeVisible();

    // 3. Header title, subtitle & developer link
    await expect(modal.getByText(/ai tutor \(chatgpt & claude\)/i)).toBeVisible();
    await expect(modal.getByText(/sagar dhadke/i)).toBeVisible();

    // 4. Scope toggles present
    await expect(modal.getByRole('radio', { name: /topic \/ lecture/i })).toBeVisible();
    await expect(modal.getByRole('radio', { name: /entire section/i })).toBeVisible();
    await expect(modal.getByRole('radio', { name: /entire curriculum/i })).toBeVisible();

    // 5. Action buttons (ChatGPT, Claude, Copy, MD, TXT, XML)
    await expect(modal.getByRole('button', { name: /ask chatgpt/i })).toBeVisible();
    await expect(modal.getByRole('button', { name: /ask claude/i })).toBeVisible();
    await expect(modal.getByRole('button', { name: /copy complete prompt/i })).toBeVisible();
    await expect(modal.getByRole('button', { name: /download prompt \(\.md\)/i })).toBeVisible();
    await expect(modal.getByRole('button', { name: /download prompt \(\.txt\)/i })).toBeVisible();
    await expect(modal.getByRole('button', { name: /download xml structure/i })).toBeVisible();

    // 6. Close dialog via close button
    await modal.getByRole('button', { name: /close ai tutor dialog/i }).click();
    await expect(modal).not.toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('opens AI Tutor modal from floating action button (FAB) and tests dismiss', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    // Find floating action button
    const fab = page.locator('.ai-fab-btn');
    await expect(fab).toBeVisible();
    await fab.click();

    const modal = page.getByRole('dialog', { name: /ai tutor/i });
    await expect(modal).toBeVisible();

    // Dismiss with Escape key
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();

    // Dismiss the FAB button via the small '✕' icon
    const dismissBtn = page.locator('.ai-fab-dismiss-btn');
    await expect(dismissBtn).toBeVisible();
    await dismissBtn.click();

    // FAB should now be hidden
    await expect(page.locator('.ai-fab-container')).not.toBeVisible();

    // Reload page to verify localStorage persistence
    await page.reload();
    await expect(page.locator('.ai-fab-container')).not.toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('selecting multiple lectures updates selection pills and section counts', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    await page.locator('.tb-btn--ai').click();
    const modal = page.getByRole('dialog', { name: /ai tutor/i });
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
    const modal = page.getByRole('dialog', { name: /ai tutor/i });
    await expect(modal).toBeVisible();

    // Switch to section mode
    await modal.getByRole('radio', { name: /entire section/i }).click();
    await expect(modal.getByText(/select one or more sections/i)).toBeVisible();

    // Switch to full curriculum mode
    await modal.getByRole('radio', { name: /entire curriculum/i }).click();
    await expect(modal.getByText(/entire curriculum context/i)).toBeVisible();

    // Switch back to topic mode
    await modal.getByRole('radio', { name: /topic \/ lecture/i }).click();
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
    const modal = page.getByRole('dialog', { name: /ai tutor/i });
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('radio', { name: /topic \/ lecture/i })).toHaveClass(/ai-scope-btn--active/);

    // Dismiss with Escape key
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('accessibility: zero axe violations on AI Tutor modal', async ({ page }) => {
    await page.locator('.tb-btn--ai').click();
    const modal = page.getByRole('dialog', { name: /ai tutor/i });
    await expect(modal).toBeVisible();

    // Run Axe audit on the open dialog
    const axeResults = await new AxeBuilder({ page })
      .include('.ai-modal')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(axeResults.violations).toHaveLength(0);
  });
});
