import { dateKey } from '../../../utils/time.js';

/**
 * Practice Day Domain Model (Pure Domain Logic)
 * Decoupled from React, DOM, and UI rendering.
 *
 * Invariants & Business Rules:
 * 1. Users can mark practice days for today and a maximum of 5 days in the past (5-day retroactive window).
 * 2. Within this 5-day window, eligible dates are those that are empty OR have an auto-applied streak shield.
 * 3. Dates older than 5 days are strictly rejected and cannot be marked as practice days.
 * 4. Dates in the future or prior to the course start date cannot be marked.
 * 5. Dates with watched lectures (watchedCount > 0) cannot be marked as practice days.
 * 6. When a practice day is recorded on a date that had an auto-applied shield, the shield is refunded to the balance.
 * 7. When unmarking a practice day, practice status is cleanly removed.
 */

export const MAX_PRACTICE_DAY_RETROACTIVE_DAYS = 5;
export const MIN_PRACTICE_NOTE_WORDS = 10;

/**
 * Calculates calendar day difference between a target date key and a reference date (today).
 * Returns:
 *   < 0 for future dates
 *   0 for today
 *   1 for yesterday
 *   > 5 for dates older than 5 days
 *
 * @param {string} targetDateKey - YYYY-MM-DD
 * @param {Date|string} [referenceDate] - Defaults to new Date()
 * @returns {number} whole calendar days difference
 */
export function getDayDifference(targetDateKey, referenceDate = new Date()) {
  if (!targetDateKey || typeof targetDateKey !== 'string') return NaN;
  const parts = targetDateKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return NaN;

  const targetMidnight = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);

  const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const refMidnight = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 0, 0, 0, 0);

  return Math.round((refMidnight.getTime() - targetMidnight.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Checks whether a given date is eligible to be marked as a practice day.
 * Enforces the strict 5-day retroactive boundary, course start date, and activity checks.
 *
 * @param {object} params
 * @param {string} params.dateKey - Target date in YYYY-MM-DD format
 * @param {object} [params.history] - Activity history map
 * @param {string|null} [params.startDate] - Course start date
 * @param {Date|string} [params.referenceDate] - Defaults to current date
 * @param {number} [params.maxDays] - Max days allowed (defaults to 5)
 * @returns {{ eligible: boolean, reason?: string, message: string, hasAutoShield?: boolean, diffDays?: number }}
 */
export function canMarkPracticeDay({
  dateKey: targetDateKey,
  history = {},
  startDate = null,
  referenceDate = new Date(),
  maxDays = MAX_PRACTICE_DAY_RETROACTIVE_DAYS,
}) {
  if (!targetDateKey) {
    return { eligible: false, reason: 'INVALID_DATE', message: 'No date specified.' };
  }

  const diff = getDayDifference(targetDateKey, referenceDate);
  if (isNaN(diff)) {
    return { eligible: false, reason: 'INVALID_DATE', message: 'Invalid date format.' };
  }

  // 1. Future date check
  if (diff < 0) {
    return {
      eligible: false,
      reason: 'FUTURE_DATE',
      message: 'Cannot mark future dates as practice days.',
      diffDays: diff,
    };
  }

  // 2. 5-day retroactive boundary check
  if (diff > maxDays) {
    return {
      eligible: false,
      reason: 'BEYOND_5_DAY_LIMIT',
      message: `Practice days can only be marked within the last ${maxDays} days of the current date.`,
      diffDays: diff,
    };
  }

  // 3. Course start date check
  if (startDate && targetDateKey < startDate) {
    return {
      eligible: false,
      reason: 'BEFORE_START_DATE',
      message: `Cannot mark practice days before the course start date (${startDate}).`,
      diffDays: diff,
    };
  }

  const bucket = history[targetDateKey];

  // 4. Already has watched lectures
  if (bucket?.watchedCount > 0) {
    return {
      eligible: false,
      reason: 'ALREADY_WATCHED_LECTURE',
      message: "You have already watched a lecture on this day — lecture activity already counts toward your streak.",
      diffDays: diff,
    };
  }

  // 5. Already marked as practice
  if (bucket?.isPractice) {
    return {
      eligible: false,
      reason: 'ALREADY_PRACTICE_DAY',
      message: 'This day is already marked as a practice day.',
      diffDays: diff,
    };
  }

  const hasAutoShield = !!(bucket?.isStreakFreeze || bucket?.isTrialStreak);

  return {
    eligible: true,
    hasAutoShield,
    diffDays: diff,
    message: hasAutoShield
      ? 'Eligible to replace auto-applied streak shield with practice day credit.'
      : 'Eligible to mark as practice day.',
  };
}

/**
 * Applies a practice day to activity history with full validation.
 * If the target date had an auto-applied streak shield, the shield is refunded
 * to freezeStore balance so the user does not forfeit their protection.
 *
 * @param {object} params
 * @param {object} params.history - Current activity history map
 * @param {object} [params.freezeStore] - Streak freeze store state
 * @param {string} params.targetDateKey - YYYY-MM-DD
 * @param {string} [params.note] - Notes describing practice work
 * @param {string|null} [params.startDate] - Course start date
 * @param {Date|string} [params.referenceDate] - Defaults to current date
 * @param {number} [params.minWords] - Minimum word count (default: 10)
 * @param {boolean} [params.bypassWordCheck] - Bypass word check for programmatic calls
 * @returns {{ success: boolean, error?: string, reason?: string, history: object, freezeStore: object, shieldRefunded?: boolean, targetDateKey?: string }}
 */
export function applyPracticeDay({
  history = {},
  freezeStore = {},
  targetDateKey,
  note = '',
  startDate = null,
  referenceDate = new Date(),
  minWords = MIN_PRACTICE_NOTE_WORDS,
  bypassWordCheck = false,
}) {
  const check = canMarkPracticeDay({
    dateKey: targetDateKey,
    history,
    startDate,
    referenceDate,
  });

  if (!check.eligible) {
    return {
      success: false,
      error: check.message,
      reason: check.reason,
      history,
      freezeStore,
    };
  }

  const trimmedNote = (note || '').trim();
  const words = trimmedNote ? trimmedNote.split(/\s+/).filter(Boolean).length : 0;
  if (!bypassWordCheck && words < minWords) {
    return {
      success: false,
      error: `Please write at least ${minWords} words about what you practiced (currently ${words}).`,
      reason: 'NOTE_TOO_SHORT',
      history,
      freezeStore,
    };
  }

  const prevBucket = history[targetDateKey] || { watchedSec: 0, watchedCount: 0, lectureIds: [] };
  const hadAutoShield = !!(prevBucket.isStreakFreeze || prevBucket.isTrialStreak);

  // Set practice status and clean any auto-shield flags
  const nextBucket = {
    ...prevBucket,
    isPractice: true,
    practiceNote: trimmedNote,
  };
  delete nextBucket.isStreakFreeze;
  delete nextBucket.isTrialStreak;
  delete nextBucket.freezeNote;

  const nextHistory = {
    ...history,
    [targetDateKey]: nextBucket,
  };

  // If this date had an auto-applied shield, refund it back to freezeStore
  let nextFreezeStore = { ...freezeStore };
  let shieldRefunded = false;

  if (hadAutoShield && Array.isArray(nextFreezeStore.usedFreezes)) {
    const matchIndex = nextFreezeStore.usedFreezes.findIndex(
      (item) => item.date === targetDateKey && item.reason === 'auto_missed_day_protection'
    );
    if (matchIndex >= 0) {
      const updatedUsed = [...nextFreezeStore.usedFreezes];
      updatedUsed.splice(matchIndex, 1);
      nextFreezeStore = {
        ...nextFreezeStore,
        availableFreezes: (nextFreezeStore.availableFreezes || 0) + 1,
        usedFreezes: updatedUsed,
      };
      shieldRefunded = true;
    }
  }

  return {
    success: true,
    history: nextHistory,
    freezeStore: nextFreezeStore,
    shieldRefunded,
    targetDateKey,
    diffDays: check.diffDays,
  };
}

/**
 * Removes practice day status from a given date.
 *
 * @param {object} params
 * @param {object} params.history - Current activity history map
 * @param {string} params.targetDateKey - YYYY-MM-DD
 * @returns {{ success: boolean, history: object, targetDateKey: string }}
 */
export function removePracticeDay({
  history = {},
  targetDateKey,
}) {
  if (!targetDateKey || !history[targetDateKey]?.isPractice) {
    return { success: false, history, targetDateKey };
  }

  const bucket = { ...history[targetDateKey] };
  delete bucket.isPractice;
  delete bucket.practiceNote;

  return {
    success: true,
    history: {
      ...history,
      [targetDateKey]: bucket,
    },
    targetDateKey,
  };
}
