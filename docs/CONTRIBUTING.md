# Contributing to Java Course Tracker

Thank you for your interest in contributing to **Java Course Tracker**! We are committed to maintaining a clean, secure, and production-ready repository.

---

## Engineering & Development Workflow

To ensure high code quality, security, and stability, all contributors must follow this standard GitHub workflow:

### 1. Branching Strategy
* **Never push directly to `main`**. Direct pushes to `main` are strictly forbidden and blocked by GitHub branch protection.
* Always create a focused, descriptive feature or bug-fix branch off the latest `main`:
  ```bash
  git checkout main
  git pull origin main
  git checkout -b feat/your-feature-name
  # or
  git checkout -b fix/your-bug-fix
  ```

### 2. Local Verification Before Committing
Before committing your changes locally, ensure all automated verification checks pass:
```bash
# Run unit & component tests
npm test

# Run code linter
npm run lint

# Verify production build compiles without warnings
npm run build

# Run end-to-end tests (if UI flows were modified)
npm run test:e2e
```

### 3. Local Pre-commit Security Checks
This repository uses **Husky** to enforce pre-commit checks:
* Any staged files matching forbidden patterns (`.env*`, `AGENTS.md`, `CLAUDE.md`, `.agents/`, `docs/bugs/`, `report-temp/`, `*.log`, `*.key`, `*.pem`) will cause the commit to abort.
* Any staged diff matching unmasked API keys or personal `@gmail.com` addresses will cause the commit to abort.
* Do not bypass pre-commit hooks (`--no-verify`).

### 4. Opening a Pull Request
1. Push your feature branch to your GitHub fork or origin:
   ```bash
   git push origin feat/your-feature-name
   ```
2. Open a Pull Request targeting `main`.
3. Fill out the PR template completely, checking off the security and verification checklist.
4. **Wait for CI to pass:** GitHub Actions will run automated security audits, forbidden-file checks, linting, tests, and production build checks.
5. Once all CI checks pass and code review approval is obtained, the branch may be squash-merged into `main`.

---

## Code Standards
* **React 19 Hooks & Idioms:** Ensure functional components are clean, dependencies are properly specified in `useEffect`/`useMemo`/`useCallback`, and asynchronous state updates in tests are wrapped in `act(...)`.
* **Zero Secrets:** Never hardcode credentials, private tokens, or test keys in source code. Dynamic string builders must be used for mock test fixtures.
* **No Telemetry / Offline-First:** Preserve the 100% client-side privacy guarantee. Do not introduce remote analytics or tracking beacons.
