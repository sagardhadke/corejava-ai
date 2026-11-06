# BUG-8: Command Palette ARIA Violation (`aria-required-children` in `.cp-body`)

**Severity**: High (WCAG 2.1 AA — 4.1.2 Name, Role, Value)  
**Status**: Fixed  
**Found during**: Automated Axe Accessibility Audit on Command Palette  

## Description
When opening the command palette (`Ctrl+K`), Axe Core reported a critical accessibility violation:
`aria-required-children`: "Ensure elements with an ARIA role that require child roles contain them".

## Impact
Screen readers and assistive technologies expecting a formal listbox structure received generic `div` elements instead of `role="option"` items, preventing proper option announcement and state tracking.

## Root Cause
In `src/components/CommandPalette.jsx`:
The scrollable container `.cp-body` had `role="listbox"` applied, but its child items had no `role="option"`. Furthermore, when the query yielded 0 results, the empty state div inside violated listbox child requirements.

## Solution
1. In `src/components/CommandPalette.jsx`:
   - Updated `.cp-body` role to `role="region"` with `aria-label="Command search results"` and `tabIndex={0}`.
   - Assigned `role="button"` and `tabIndex={0}` to each `.cp-item` along with `onKeyDown` handlers for Enter execution.
   - Assigned `role="status"` to `.cp-empty` for screen reader live feedback.
2. Verified with Axe in Playwright E2E (`e2e/flow-10-command-palette.spec.ts`): zero violations.
