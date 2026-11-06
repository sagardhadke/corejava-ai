/**
 * E2E: Flow 7 — Multi-Course Management & XML Import
 * Tests importing a new course via XML, adding alongside existing courses,
 * switching between courses via CourseSelector, and persistence across reload.
 */

import { test, expect } from '@playwright/test';

test.describe('Flow 7 — Multi-Course Management & XML Import', () => {
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

  test('imports a course via XML and allows switching between courses', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    // Open settings drawer
    await page.locator('.header-settings-btn').click();
    await page.waitForTimeout(300);

    // Click Import course from XML
    const importBtn = page.getByRole('button', { name: /import course from xml/i });
    await expect(importBtn).toBeVisible();
    await importBtn.click();
    await page.waitForTimeout(300);

    // Import modal should be open
    const modal = page.locator('.ci-modal');
    await expect(modal).toBeVisible();

    // Upload XML content
    const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<course>
  <title>Advanced Spring Boot 3</title>
  <sections>
    <section number="01" title="Spring Core Essentials">
      <items>
        <item type="video" title="Dependency Injection and IoC" duration="30m"/>
      </items>
    </section>
  </sections>
</course>`;

    await page.locator('input[type="file"]').setInputFiles({
      name: 'spring-boot.xml',
      mimeType: 'application/xml',
      buffer: Buffer.from(sampleXml),
    });

    // Preview should appear with "Add alongside current course" option
    await expect(page.getByText('Advanced Spring Boot 3')).toBeVisible();
    const addBtn = page.getByRole('button', { name: /add alongside current course/i });
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    await page.waitForTimeout(500);

    // Course selector should now be in the header
    const selectorTrigger = page.locator('.cs-trigger');
    await expect(selectorTrigger).toBeVisible();
    await expect(selectorTrigger).toContainText('Advanced Spring Boot 3');

    // Section from new course should be rendered
    await expect(page.locator('.section-card__title').getByText('Spring Core Essentials')).toBeVisible();

    // Switch back to original course via selector
    await selectorTrigger.click();
    await page.waitForTimeout(200);
    const originalOption = page.locator('.cs-option').first();
    await originalOption.click();
    await page.waitForTimeout(300);

    // Original course sections should be visible again
    await expect(page.locator('.section-card__title').getByText('Java Fundamentals')).toBeVisible();

    // Reload page to test persistence
    await page.reload();
    await page.waitForSelector('.cs-trigger');
    await expect(page.locator('.cs-trigger')).toBeVisible();

    expect(errors).toHaveLength(0);
  });
});
