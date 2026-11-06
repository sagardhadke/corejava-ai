import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('A11y Audit Detail', () => {
  test('audit main page and log all violations with target elements', async ({ page }) => {
    // Dismiss motivation popup by marking it shown in localStorage before load
    await page.addInitScript(() => {
      localStorage.setItem('jct_motivation_shown_v1', JSON.stringify({ date: new Date().toISOString().slice(0, 10) }));
    });

    await page.goto('/');
    await page.waitForSelector('.app-shell', { timeout: 15000 });

    const results = await new AxeBuilder({ page })
      .exclude('.developer-badge')
      .analyze();

    if (results.violations.length > 0) {
      console.log('=== AXE VIOLATIONS (' + results.violations.length + ') ===');
      for (const v of results.violations) {
        console.log(`\nRule: [${v.id}] (${v.impact}) - ${v.help}`);
        for (const node of v.nodes) {
          console.log(`  Selector: ${node.target.join(' ')}`);
          console.log(`  HTML: ${node.html}`);
          console.log(`  Summary: ${node.failureSummary}`);
        }
      }
    }

    expect(results.violations).toHaveLength(0);
  });
});
