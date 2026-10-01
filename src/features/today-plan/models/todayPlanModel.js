/**
 * Today's Plan Domain Model (Pure Domain Logic)
 */

export function computeAutoPlanIds(targetSec, watchedSet, allLectures = []) {
  const ids = [];
  let sum = 0;
  for (const l of allLectures) {
    if (watchedSet.has(l.id)) continue;
    ids.push(l.id);
    sum += l.durationSec || 0;
    if (sum >= targetSec) break;
  }
  return ids;
}

export function computePlanStats(allLectures = [], planSet = new Set(), watchedSet = new Set()) {
  const planned = allLectures.filter((l) => planSet.has(l.id));
  const plannedSec = planned.reduce((a, l) => a + (l.durationSec || 0), 0);
  const plannedWatched = planned.filter((l) => watchedSet.has(l.id));
  const plannedWatchedSec = plannedWatched.reduce((a, l) => a + (l.durationSec || 0), 0);
  const plannedRemainingSec = plannedSec - plannedWatchedSec;

  return {
    planned,
    plannedCount: planned.length,
    plannedSec,
    plannedWatchedCount: plannedWatched.length,
    plannedWatchedSec,
    plannedRemainingSec,
  };
}
