# BUG-1: `computeCourseStats` does not return `plannedWatchedSec`

**Flow**: Flow 3 — Today's Plan · Flow 2 — Mark Lecture Watched  
**Severity**: High

## Steps to Reproduce
1. Add any lecture to Today's Plan.
2. Mark that lecture as watched.
3. Inspect `stats.plannedWatchedSec` in any consumer component (`StatsBar`, `useCourseProgress`, etc.).

## Expected
`stats.plannedWatchedSec` should equal the sum of `durationSec` for all watched planned lectures (e.g., 1200s when a 20m planned lecture is watched).

## Actual
`stats.plannedWatchedSec` is `undefined`. The variable `plannedWatchedSec` is computed inside `computeCourseStats()` but is **never included in the returned object**.

## Root Cause
In `src/features/course/models/courseProgressModel.js`, lines 15–17 compute `plannedWatchedSec`, and line 29 computes `plannedWatchedCount`, but `plannedWatchedSec` is omitted from the `return {}` on lines 20–32.

```js
// Computed but NEVER returned:
const plannedWatchedSec = planned
  .filter((l) => watchedSet.has(l.id))
  .reduce((acc, l) => acc + (l.durationSec || 0), 0);
```

## Impact
- `StatsBar` → "Daily target hit" logic reads `stats.plannedWatchedSec` to determine if the user hit their daily goal. Because `plannedWatchedSec` is `undefined`, the target is **never shown as hit**, even after the user watches all their planned lectures.
- Downstream callers that spread `stats` or use `stats.plannedWatchedSec` silently get `undefined`.

## Fix Applied
- File: [`src/features/course/models/courseProgressModel.js`](file:///d:/Web%20Development/java-course-tracker/src/features/course/models/courseProgressModel.js#L20-L32)
- Added `plannedWatchedSec` to the returned object.

## Test Added
- `src/features/course/models/domainModels.test.js` → `computeCourseStats > computes planned stats correctly`

