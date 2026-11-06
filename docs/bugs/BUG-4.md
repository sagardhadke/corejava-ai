# BUG-4: Sidebar Card Headings Oversized (`TodayPlanCard` & `PerSectionProgress` `h2` vs `h3` selector mismatch)

**Severity**: High (UI / Layout & Visual Aesthetics)  
**Status**: Fixed  
**Found during**: Visual UI audit on live Chrome browser (user screenshot review)  

## Description
In the desktop sticky sidebar, the titles for **Today's plan** and **Per-section progress** appeared in an excessively large font size (~24px/1.5em) with unstyled browser margins. In **Per-section progress**, the text was so large that it wrapped onto two lines ("Per-section" / "progress"), breaking the card's vertical rhythm and header alignment with the `1/18 done` badge.

## Impact
1. Visual degradation: Heading sizes in the sidebar (24px) were larger than the main course title in the header (15.5px) and section titles (14px).
2. Header layout distortion: "Per-section progress" wrapped onto two lines, displacing the card's layout and consuming excessive vertical space in the sticky sidebar.
3. Inconsistent hierarchy across devices: Mobile responsive font sizes were not applied.

## Root Cause
In commit `b26e5be`, headings were upgraded from `<h3>` to `<h2>` to satisfy WCAG 2.1 AA heading structure:
- `TodayPlanCard.jsx`: `<h2>Today's plan ...</h2>`
- `PerSectionProgress.jsx`: `<h2>Per-section progress</h2>`

However, the corresponding stylesheets (`TodayPlanCard.css` and `PerSectionProgress.css`) specifically targeted `h3`:
```css
/* In TodayPlanCard.css - only matched h3 */
.today-card__head h3 { font-size: 13.5px; ... }

/* In PerSectionProgress.css - only matched h3 */
.psp-card__head h3 { font-size: 13px; ... }
```
Because the HTML elements were `h2`, the CSS rules did not match. The elements inherited default browser user-agent styles (`font-size: 1.5em; font-weight: bold; margin-block: 0.83em;`). Furthermore, `tokens.css` had no default fallback size for `h2`/`h3`.

## Solution
1. **Updated `src/features/today-plan/views/TodayPlanCard.css`**:
   - Targeted `.today-card__head h2, .today-card__head h3` with `font-size: 13.5px; font-weight: 700; margin: 0; line-height: 1.2;`.
   - Updated mobile breakpoint `@media (max-width: 640px)` to apply `font-size: 13px; margin: 0;`.
2. **Updated `src/features/course/views/PerSectionProgress.css`**:
   - Targeted `.psp-card__head h2, .psp-card__head h3` with `font-size: 13px; font-weight: 700; margin: 0; line-height: 1.2; white-space: nowrap;`.
   - Updated mobile breakpoint `@media (max-width: 640px)` to apply `font-size: 12.5px; margin: 0;`.
3. **Defensive Base Typography in `src/styles/tokens.css`**:
   - Added global fallback typography rules for `h2` (`15px, 700`), `h3` (`13.5px, 600`), and `h4` (`12px, 600`) so any component heading tag transitions in the future never inherit browser default sizes.
4. **Verified via live visible Chrome browser agent**:
   - Both cards verified with crisp 13–13.5px headings, single-line alignment, and proper vertical spacing.

