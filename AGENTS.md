# Development & Engineering Rules

## 1. Feature-Wise & Bug-Wise Atomic Commits
- **Never bundle multiple distinct changes into a single commit.**
- Every bug fix, feature, or enhancement must have its own dedicated, atomic commit.
- Keep commits focused: only stage the specific source files and unit tests directly related to that single feature or bug fix.
- Use standard Conventional Commits naming:
  - `fix(security): ...`
  - `fix(streak): ...`
  - `feat(badges): ...`
  - `feat(course): ...`

## 2. Multi-Scenario Testing Before Every Release
- Before presenting any change for production, always create and verify **multiple realistic dummy user scenarios** (e.g., active streak, inactive user, boundary edge cases, security challenges, error recoveries).
- Provide the user with exact commands to load scenarios in Chrome DevTools Console (`testScenarios.load(...)`).

## 3. Strict Testing Isolation (`local-testing/`)
- All test scripts, dummy scenario loaders, and QA audit reports must live exclusively inside `local-testing/`.
- `local-testing/` must remain permanently ignored in `.gitignore`.
- **Zero test scaffolding, temporary files, or dummy data may ever be committed to git or bundled into production.**

## 4. In-Depth Code & Browser Review Instructions
- For every proposed change, explicitly provide the user with:
  1. Exact files, functions, and line numbers to inspect in their editor.
  2. Step-by-step browser testing instructions (what to click, what to verify, DevTools storage checks).
  3. Terminal verification commands (`npm test`, `npm run build`).

## 5. Absolute Prohibition on Autonomous Git Pushes
- **NEVER execute `git push` without explicit user sign-off.**
- Always stop, show the exact commit message, summarize the diff, and ask for user confirmation before pushing to production.
