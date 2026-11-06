# QA Fix Workflow (`/qa-fix`)

## Purpose
Run the full QA loop: discover bugs, write failing tests, fix app code, repeat until green.

---

## Procedure

### Step 1 — Baseline Run
```bash
npm run test:all
```
Record all failures. If the build itself fails, fix build errors first.

### Step 2 — Coverage Audit
Using the `qa-senior` skill, identify flows with no test coverage.
Add component tests and E2E tests for each uncovered flow.

### Step 3 — Fix Loop (max 5 iterations)

For each test failure:

1. **Document the bug** → create `/docs/bugs/BUG-<n>.md`
2. **Write a failing test** that reproduces the exact bug
3. **Fix the app code** (never modify tests to hide bugs)
4. **Re-run** `npm run test:all`
5. Confirm the test now passes and no other tests regressed

Repeat until all tests are green OR max 5 iterations reached.

If 5 iterations are exhausted, stop and report remaining failures.

### Step 4 — Visual Pass
Use the browser subagent to screenshot:
- Main view at 375px, 768px, 1440px
- Settings panel open
- Calendar/Streak panel open
- Badges panel open

Check for visual regressions, overflow, contrast, clipped text.

### Step 5 — Final Report
Produce a summary:
- Total bugs found
- Bugs fixed (with BUG-N references)
- Bugs still open (if iteration limit hit)
- Final `npm run test:all` output
- Screenshot links

---

## Rules
- Do not commit — the user reviews the diff.
- Do not install new packages without asking.
- Do not weaken or delete tests.
- If a test is flaky (not a real bug), document it and quarantine with `.skip` only after explanation.

