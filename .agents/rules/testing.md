# Testing Rules (Always On)

These rules apply to every task in this workspace without exception.

## Completion Gate
- **Never say a task is done without running `npm run test:all` and showing the full output.**
- **Never claim a UI works without verifying it in real Chrome (Playwright or the browser subagent) with a screenshot.**

## Bug Fix Protocol
- Every bug fix starts with a **failing test that reproduces the bug** — write the test first.
- Never delete or weaken a test to make it pass. If a test is wrong, explain why before removing it.

## Console Error Policy
- Any `console.error` or page error (`pageerror` event) is treated as a **test failure**.
- Tests must assert no console errors occurred unless the error is explicitly expected and documented.

## State Coverage
Every test suite must cover all five states:
1. **Empty** — no data in localStorage, fresh install
2. **Loading** — async or deferred renders
3. **Error** — corrupted/missing storage, invalid inputs
4. **Populated** — realistic data present
5. **After page reload** — state must persist and re-render correctly

## Selector Policy
- Query by **role, label, or accessible text** only (`getByRole`, `getByLabelText`, `getByText`).
- Never query by CSS class names or test IDs unless there is no accessible alternative.

## Accessibility
- Every E2E test suite must include an axe scan with **zero violations**.
- Keyboard navigation must be explicitly tested for all interactive flows.

