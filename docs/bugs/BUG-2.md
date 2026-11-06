# BUG-2: Accessibility Violations (WCAG 2 AA Failures)

**Flow**: Flow 1 — First Load · Flow 2 — Section Card · Flow 3 — Today's Plan  
**Severity**: High

## Summary
The automated Axe accessibility audit detected 4 distinct WCAG 2 AA rule violations across the main view:

1. **`color-contrast` (Serious)**:
   - `--ink-faint: #626874` on background `--surface` (`#131519`) and `--surface-2` (`#191c22`) only provided a contrast ratio of 3.04:1 to 3.26:1 (expected minimum 4.5:1).
   - `--amber-dim: #8a6600` on background `#131519` only provided a contrast ratio of 3.46:1 (expected minimum 4.5:1).
   - Affected elements: `.clock`, `.stat-card__label`, `.stat-card__sub`, `.lecture-row__dur`, `.section-card__meta`, `.psp-item__number`, `.psp-item__count`.

2. **`heading-order` (Moderate)**:
   - `Header.jsx` renders `<h1>`, but `TodayPlanCard.jsx` and `PerSectionProgress.jsx` immediately jumped to `<h3>`, skipping `<h2>`. WCAG requires heading levels to increase by one.

3. **`label-content-name-mismatch` (Serious)**:
   - `SectionCard.jsx` header button used `aria-label="Expand Section X: Title"`. The visible text did not match the start of the accessible name, violating WCAG 2.5.3 (Label in Name).
   - `DeveloperBadge.jsx` had visible text "Crafted by Sagar Dhadke" but `aria-label="Sagar Dhadke - GitHub profile"`.

4. **`scrollable-region-focusable` (Serious)**:
   - `PerSectionProgress.jsx` has a scrollable list `.psp-list` that was not focusable by keyboard (`tabIndex={0}` missing).

## Fix Applied
1. Updated `src/styles/tokens.css`:
   - Changed `--ink-faint` from `#626874` to `#949baa` (> 4.8:1 contrast).
   - Changed `--amber-dim` from `#8a6600` to `#c49400` (> 4.6:1 contrast).
2. Updated `TodayPlanCard.jsx` and `PerSectionProgress.jsx` to use `<h2>` instead of `<h3>`.
3. Updated `SectionCard.jsx` to remove the redundant `aria-label` (accessible name naturally derives from visible contents and `aria-expanded` conveys state).
4. Updated `DeveloperBadge.jsx` `aria-label` to "Crafted by Sagar Dhadke - GitHub profile (opens in new tab)".
5. Added `tabIndex={0}` and `aria-label="Section progress list"` to `.psp-list` in `PerSectionProgress.jsx`.

## Test Added
- `e2e/accessibility.spec.ts`
