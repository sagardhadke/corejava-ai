# 🐞 Core Java + AI Course Tracker — Master Bug Tracker

**Last Updated**: 2026-11-06  
**Status**: All Bugs Resolved & Verified (100% Pass Rate)

---

## 📊 Summary Dashboard

| Bug ID | Title | Category | Severity | Status | Commit / Fix |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-1** | `plannedWatchedSec` Missing in `computeCourseStats` | Data Model | Medium | **Fixed** | `b26e5be` |
| **BUG-2** | Sub-standard WCAG Contrast (`--amber-dim`, `--ink-faint`) | Accessibility / UI | High | **Fixed** | `b26e5be` |
| **BUG-3** | Lecture Plan Checkbox Inaccessible via Keyboard (`display: none`) | Accessibility / A11y | Medium | **Fixed** | `f117a22` |
| **BUG-4** | Sidebar Card Headings Oversized (`TodayPlanCard` & `PerSectionProgress`) | UI / Layout | High | **Fixed** | Working Tree |
| **BUG-5** | 5-Hour Daily Learning Cap & Locking System Bypassed | Security / Business Logic | Critical | **Fixed** | `3851327` & `3c3ac39` |
| **BUG-6** | Proactive Remaining Daily Cap Locking on Syllabus Lectures | UX / Real-Time Tracking | High | **Fixed** | `3c3ac39` |
| **BUG-7** | Unwatch/Un-mark Fails to Restore Daily Budget and Unlock Lectures | Business Logic / State Sync | High | **Fixed** | `37e6773` |
| **BUG-8** | Command Palette ARIA Violation & Keyboard Activation | Accessibility / A11y | Medium | **Fixed** | `50a0df8` |

---

## 📋 Detailed Bug Records

### 1. BUG-4: Sidebar Card Headings Oversized (`Today's plan` & `Per-section progress`)
- **Category**: UI / Layout / Visual Quality
- **Symptoms**: In the desktop sidebar, `Today's plan` and `Per-section progress` appeared in huge 24px browser default fonts; `Per-section progress` wrapped onto two lines.
- **Root Cause**: Headings were changed from `<h3>` to `<h2>` for accessibility heading hierarchy, but `TodayPlanCard.css` and `PerSectionProgress.css` only targeted `h3`.
- **Resolution**:
  - Added dual selectors `.today-card__head h2, .today-card__head h3` (`13.5px`, `font-weight: 700`, `margin: 0`).
  - Added dual selectors `.psp-card__head h2, .psp-card__head h3` (`13px`, `font-weight: 700`, `margin: 0`, `white-space: nowrap`).
  - Added fallback typography in `tokens.css` for `h2` (`15px`), `h3` (`13.5px`), `h4` (`12px`).
- **Verification**: Verified via live Chrome browser agent. Single-line headings aligned cleanly.

---

### 2. BUG-5: 5-Hour Daily Learning Cap & Content Lock Gate
- **Category**: Business Logic / Gatekeeper
- **Symptoms**: Users reported being able to mark lectures past the 5-hour daily threshold without being blocked.
- **Root Cause**: `checkDailyLimitGate` was defined in domain models but omitted from the active state update path in `useCourseProgress.js`.
- **Resolution**:
  - Integrated `checkDailyLimitGate` directly into `toggleWatched`.
  - Stored and persisted learning seconds in `trackingStore` and synchronized with `jct_history`.
  - Dispatches `DailyLimitDialog` when user attempts to exceed the 5-hour cap.
- **Verification**: Verified via `node local-testing/live-browser-agent.mjs` and `deep-tracker-verification.mjs`.

---

### 3. BUG-6: Proactive Remaining Daily Cap Locking
- **Category**: UX / Real-Time UI Feedback
- **Symptoms**: Lectures were only locked *after* exactly reaching 18,000s; an uncompleted 30m lecture would appear clickable even when only 10m was left in the day.
- **Root Cause**: UI didn't compare individual lecture duration against remaining cap seconds (`todayRemainingCapSec`).
- **Resolution**:
  - Calculated `todayRemainingCapSec = max(0, 18000 - todayLearnedSec)`.
  - Wired `wouldExceedRemainingCap = todayRemainingCapSec < lecture.durationSec` into `LectureRow` and `TodayPlanCard`.
  - Rendered proactive `LOCKED` badge and custom remaining-time tooltip.
- **Verification**: Verified via `node local-testing/live-browser-agent.mjs` (Step 3).

---

### 4. BUG-1: `plannedWatchedSec` Property Return
- **Category**: Data Model
- **Symptoms**: `plannedWatchedSec` was calculated in `computeCourseStats` but omitted from the return object.
- **Resolution**: Added `plannedWatchedSec` to return object in `courseProgressModel.js`.

---

### 5. BUG-2: WCAG 2.1 AA Color Contrast
- **Category**: Accessibility / Theme
- **Symptoms**: Low contrast on dark backgrounds for `--amber-dim` (#8a6600) and `--ink-faint` (#626874).
- **Resolution**: Updated `--amber-dim` to `#c49400` and `--ink-faint` to `#949baa`, meeting 4.5:1 ratio.

---

### 6. BUG-3: Keyboard Navigation on Plan Checkbox
- **Category**: Accessibility
- **Symptoms**: Checkbox input was styled with `display: none;`, stripping it from keyboard focus.
- **Resolution**: Refactored to visually-hidden positioning with `:focus-visible` amber outline ring.

---

### 7. BUG-7: Unwatch Fails to Restore Daily Budget and Unlock Lectures
- **Category**: Business Logic / State Sync
- **Symptoms**: If a user reached the 5-hour cap (or high daily total) and unmarked/unwatched a lecture, previously locked lectures remained locked and daily learned time did not decrement in real-time due to a stale read from asynchronous React state.
- **Root Cause**: `getTodayLearnedSec` evaluated `Math.max(trackingSec, historySec)`. When unwatching, `setHistory` is asynchronous; `localStorage.getItem('jct_history__...')` still held the pre-unwatch value, pinning the daily total at the higher number.
- **Resolution**:
  - Made `trackingStore.dailyLog[dateKey].totalSec` authoritative in `learningTrackerModel.js`.
  - Added synchronous `localStorage.setItem('jct_history__...', ...)` in `useCourseProgress.js` on unwatch.
  - Forwarded `inMemoryHistory` into `checkDailyLimitGate`, `isTodayLimitReached`, and `getTodayRemainingCapSec`.
- **Verification**: Verified via `local-testing/live-browser-agent.mjs` (Step 5b) in live Chrome desktop and unit test in `learningTracker.test.mjs`.

---

### 8. BUG-8: Command Palette ARIA Violation & Keyboard Activation
- **Category**: Accessibility
- **Symptoms**: Axe reported `aria-required-children` for `.cp-body` container with `role="listbox"`. Empty query state violated listbox specs.
- **Resolution**: Changed `.cp-body` to `role="region"`, added `role="button"`, `tabIndex={0}`, and Enter key activation on items, and `role="status"` on empty state.
- **Verification**: Axe automated audit passes with 0 violations.

---

## 🛡️ Verification Evidence

| Test Suite | Pass Count | Failure Count | Status |
| :--- | :--- | :--- | :--- |
| **Live Chrome Desktop Agent** | 8 | 0 | **PASS** |
| **Vitest Component Tests** | 85 | 0 | **PASS** |
| **Legacy Integration Tests** | 67 | 0 | **PASS** |
| **Deep Tracker Verification** | 29 | 0 | **PASS** |
| **Stress Test Suite (580 Scenarios)** | 580 | 0 | **PASS** |
| **Production Build** | 0 warnings | 0 errors | **PASS** |

