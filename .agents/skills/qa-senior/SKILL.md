---
name: qa-senior
description: >
  Use this skill when writing, running, or debugging tests for the java-course-tracker app.
  Activate for: writing component tests, writing E2E tests, finding bugs, accessibility audits,
  visual passes, performance testing, or any QA-related task.
---

# QA Senior Skill

## 1. Enumerate User Flows First
Before writing any test, list all user flows from the codebase (see `.agents/rules/testing.md`).
Reference the Phase 1 inspection report in `docs/` or re-derive flows from `App.jsx` and `features/`.

## 2. Component Tests (Vitest + RTL)

Location: `src/**/*.test.{js,jsx}`
Runner: `npm test` (vitest run)

### Principles
- One describe block per component or model function.
- Test render, user-event interactions, empty state, error state, populated state.
- **Never query by CSS class** — use `getByRole`, `getByLabelText`, `getByText`, `getByPlaceholderText`.
- Mock `localStorage` using the in-memory mock in `src/tests/mocks/localStorage.mock.js`.
- Wrap components in a minimal `<TestWrapper>` that provides only what the component needs.
- Assert no `console.error` in every test block.

### Required Test Scenarios Per Component
1. Renders without crashing (empty/default props)
2. Renders with realistic populated props
3. User interaction (click, type) triggers correct callbacks
4. Empty state renders the correct empty-state message/icon
5. Error state: corrupted or null props do not crash

## 3. E2E Tests (Playwright + Real Chrome)

Location: `e2e/*.spec.ts`
Runner: `npm run test:e2e` (playwright test)

### File Naming
One spec file per user flow:
- `e2e/flow-01-first-load.spec.ts`
- `e2e/flow-02-mark-watched.spec.ts`
- `e2e/flow-03-today-plan.spec.ts`
- `e2e/flow-04-search.spec.ts`
- `e2e/flow-05-streak-calendar.spec.ts`
- `e2e/flow-06-badges.spec.ts`
- `e2e/flow-07-multi-course.spec.ts`
- `e2e/flow-08-settings.spec.ts`
- `e2e/flow-09-notifications.spec.ts`
- `e2e/flow-10-command-palette.spec.ts`
- `e2e/flow-11-mobile-nav.spec.ts`
- `e2e/flow-12-daily-limit.spec.ts`
- `e2e/flow-14-course-completion.spec.ts`
- `e2e/flow-15-persistence.spec.ts`
- `e2e/accessibility.spec.ts`

### Required Coverage Per E2E Spec
- Happy path
- Persistence across reload (`page.reload()` after state change, assert state survives)
- Offline mode: `context.setOffline(true)` then perform action
- Corrupted/missing storage: `localStorage.clear()` or inject invalid JSON
- Very long text inputs (500+ character strings)
- 500+ items (inject via `page.evaluate`)
- Keyboard navigation and focus order (Tab, Enter, Escape, Arrow keys)
- **axe accessibility scan** at the end of each spec (`AxeBuilder.analyze()`, assert 0 violations)
- Three viewports: 375px (mobile), 768px (tablet), 1440px (desktop)

### Console Error Assertion
Every test must register a `page.on('pageerror')` listener and assert no errors occurred:
```ts
const errors: Error[] = [];
page.on('pageerror', (err) => errors.push(err));
// ... test actions ...
expect(errors).toHaveLength(0);
```

## 4. Visual Pass (Browser Subagent)

After E2E tests pass, perform a visual pass using the browser subagent:
1. Screenshot every panel/page at 375px, 768px, 1440px.
2. Check for: text overflow, clipped content, broken layout, contrast issues.
3. Document failures in `/docs/bugs/`.

## 5. Bug Documentation

For every bug found, create `/docs/bugs/BUG-<n>.md`:

```markdown
# BUG-<n>: <Short Title>

**Flow**: Flow N — <Flow Name>
**Severity**: Critical / High / Medium / Low

## Steps to Reproduce
1. ...

## Expected
...

## Actual
...

## Screenshot
![screenshot](./BUG-<n>-screenshot.png)

## Root Cause
...

## Fix Applied
- File: `src/...`
- Change: ...

## Test Added
- `src/...test.jsx` — `it('...')`
```

