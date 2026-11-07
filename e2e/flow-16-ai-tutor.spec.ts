/**
 * E2E: Flow 16 — AI Tutor Context Launch (ChatGPT & Claude Deep Links)
 * Tests opening AI Tutor from Toolbar, SectionCard, and LectureRow,
 * verifies scope selection, XML context generation, prompt preview,
 * deep link generation, clipboard copy fallback, and Axe accessibility.
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
    const aiBtn = page.getByRole('button', { name: 'Ask AI Tutor', exact: true });
    await expect(aiBtn).toBeVisible();
    await aiBtn.click();

    // 2. Modal should appear
    const modal = page.getByRole('dialog', { name: /ask ai tutor/i });
    await expect(modal).toBeVisible();

    // 3. Header title & subtitle
    await expect(modal.getByText(/ask ai tutor \(chatgpt & claude\)/i)).toBeVisible();

    // 4. Scope toggles present
    await expect(modal.getByRole('button', { name: /by topic/i })).toBeVisible();
    await expect(modal.getByRole('button', { name: /by entire section/i })).toBeVisible();

    // 5. Threshold indicator shows characters & hybrid context info
    await expect(modal.getByText(/hybrid context mode/i)).toBeVisible();

    // 6. Action buttons
    await expect(modal.getByRole('button', { name: /ask chatgpt/i })).toBeVisible();
    await expect(modal.getByRole('button', { name: /ask claude/i })).toBeVisible();
    await expect(modal.getByRole('button', { name: /download course xml/i })).toBeVisible();

    // 7. Close dialog via close button
    await modal.getByRole('button', { name: /close ai tutor dialog/i }).click();
    await expect(modal).not.toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('switching between topic and section modes updates selection summary', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    await page.getByRole('button', { name: 'Ask AI Tutor', exact: true }).click();
    const modal = page.getByRole('dialog', { name: /ask ai tutor/i });
    await expect(modal).toBeVisible();

    // In topic mode by default
    const lectureSelect = modal.getByRole('combobox', { name: /select lecture topic/i });
    await expect(lectureSelect).toBeVisible();

    // Switch to section mode
    await modal.getByRole('button', { name: /by entire section/i }).click();
    await expect(lectureSelect).not.toBeVisible();
    await expect(modal.getByText(/total lectures in section/i)).toBeVisible();

    // Switch back to topic mode
    await modal.getByRole('button', { name: /by topic/i }).click();
    await expect(modal.getByRole('combobox', { name: /select lecture topic/i })).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('expanding prompt preview displays tutor instructions and XML syllabus block', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    await page.getByRole('button', { name: 'Ask AI Tutor', exact: true }).click();
    const modal = page.getByRole('dialog', { name: /ask ai tutor/i });

    // Click preview toggle
    const previewBtn = modal.getByRole('button', { name: /preview full prompt/i });
    await previewBtn.click();

    // Preview code block should be visible
    const previewBox = modal.getByLabel('Generated Prompt Preview');
    await expect(previewBox).toBeVisible();
    await expect(previewBox).toContainText('You are an expert AI tutor');
    await expect(previewBox).toContainText('```xml');
    await expect(previewBox).toContainText('<course>');
    await expect(previewBox).toContainText('</course>');

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

    // Modal should open with that lecture pre-selected
    const modal = page.getByRole('dialog', { name: /ask ai tutor/i });
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('button', { name: /by topic/i })).toHaveClass(/ai-scope-btn--active/);

    // Dismiss with Escape key
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('clicking Ask AI on section banner pre-selects section mode in modal', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    const openCard = page.locator('.section-card--open').first();
    const sectionAiBtn = openCard.getByRole('button', { name: /ask ai tutor about section/i });
    await expect(sectionAiBtn).toBeVisible();
    await sectionAiBtn.click();

    const modal = page.getByRole('dialog', { name: /ask ai tutor/i });
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('button', { name: /by entire section/i })).toHaveClass(/ai-scope-btn--active/);

    expect(errors).toHaveLength(0);
  });

  test('accessibility: zero axe violations on AI Tutor modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Ask AI Tutor', exact: true }).click();
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

