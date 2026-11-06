# BUG-3: Lecture Plan Checkbox Inaccessible via Keyboard & Screen Readers (`display: none`)

**Severity**: Medium (WCAG 2.1 AA — 2.1.1 Keyboard Accessible, 4.1.2 Name, Role, Value)  
**Status**: Fixed  
**Found during**: E2E Flow 3 test execution & RTL Accessibility Verification  

## Description
The checkbox input for adding lectures to today's plan (`.plan-check input`) was styled with `display: none;` in `LectureRow.css`.
While visual users saw the custom checkbox via an adjacent SVG span, `display: none` completely stripped the native checkbox element from the accessibility tree.

## Impact
1. Screen reader users could not discover or announce the `aria-label="Add lecture N to today's plan"` input.
2. Keyboard users could not navigate to the checkbox via Tab or activate it using Space.
3. Automated testing frameworks (Playwright) could not click the input directly without resorting to force clicks.

## Root Cause
In `src/features/course/views/LectureRow.css`, the custom checkbox pattern used `display: none` to hide the native input rather than visually-hidden absolute positioning with opacity 0:
```css
/* Defective */
.plan-check input { display: none; }
```

## Solution
1. Updated `src/features/course/views/LectureRow.css`:
   - Positioned `.plan-check input` as `position: absolute; top: 0; left: 0; width: 18px; height: 18px; opacity: 0; cursor: pointer; z-index: 1;`.
   - Added keyboard focus ring styles using `:focus-visible`:
     ```css
     .plan-check input:focus-visible + .plan-check__box {
       outline: 2px solid var(--amber);
       outline-offset: 2px;
     }
     ```
2. Added unit test in `src/features/course/views/LectureRow.test.jsx`:
   - Verified that focusing the checkbox and pressing Space triggers `onTogglePlan`.
3. Verified in Playwright E2E (`e2e/flow-03-today-plan.spec.ts`).
