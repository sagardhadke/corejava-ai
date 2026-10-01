import { dateKey } from '../../../utils/time.js';

/**
 * Streak Calculation Domain Model (Pure Domain Logic)
 */

export function isBucketQualifying(bucket, streakMode = 'any', targetSec = 5400) {
  if (!bucket) return false;
  if (bucket.isPractice) return true;
  if (streakMode === 'target') return (bucket.watchedSec || 0) >= targetSec;
  return (bucket.watchedCount || 0) > 0;
}

export function computeCurrentStreak(history = {}, streakMode = 'any', targetSec = 5400) {
  let count = 0;
  let cursor = new Date();
  if (!isBucketQualifying(history[dateKey(cursor)], streakMode, targetSec)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (isBucketQualifying(history[dateKey(cursor)], streakMode, targetSec)) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export function computeLongestStreak(history = {}, streakMode = 'any', targetSec = 5400) {
  const keys = Object.keys(history).sort();
  let best = 0, cur = 0, prevDate = null;
  for (const k of keys) {
    if (!isBucketQualifying(history[k], streakMode, targetSec)) {
      cur = 0;
      prevDate = null;
      continue;
    }
    if (prevDate) {
      const diffDays = Math.round((new Date(k) - new Date(prevDate)) / 86400000);
      cur = diffDays === 1 ? cur + 1 : 1;
    } else {
      cur = 1;
    }
    best = Math.max(best, cur);
    prevDate = k;
  }
  return best;
}
