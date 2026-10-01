import { dateKey } from '../../../utils/time.js';
import { isBucketQualifying } from './streakModel.js';

/**
 * Streak Freeze & Trial Shield Domain Model (Pure Domain Logic)
 * Decoupled from React, DOM, and UI rendering.
 *
 * Provides default 2 auto-use streak shields / trial streak freezes,
 * automatic streak bridging for missed days, and promo code redemption.
 */

export const DEFAULT_STREAK_FREEZE_COUNT = 2;

export const PROMO_CODES = {
  STREAKBOOST: { code: 'STREAKBOOST', shields: 2, label: 'Community Streak Boost (+2 Shields)' },
  SAVEMYSTREAK: { code: 'SAVEMYSTREAK', shields: 1, label: 'Emergency Rescue Shield (+1 Shield)' },
  JAVAHERO: { code: 'JAVAHERO', shields: 2, label: 'Java Hero Bonus Pack (+2 Shields)' },
  INVESTOR10B: { code: 'INVESTOR10B', shields: 3, label: 'Investor 10B VIP Shield Pack (+3 Shields)' },
  STUDENT2026: { code: 'STUDENT2026', shields: 2, label: 'Student Learner Shield (+2 Shields)' },
  ANTIGRAVITY: { code: 'ANTIGRAVITY', shields: 3, label: 'Antigravity Super Boost (+3 Shields)' },
  DAILYGRIND: { code: 'DAILYGRIND', shields: 1, label: 'Daily Grind Protector (+1 Shield)' },
};

export const SUPPORT_EMAIL = 'sagardhadke12@gmail.com';

/**
 * Creates the initial streak freeze store state for a course.
 */
export function createInitialStreakFreezeState() {
  return {
    availableFreezes: DEFAULT_STREAK_FREEZE_COUNT,
    usedFreezes: [],
    redeemedCodes: [],
  };
}

/**
 * Normalizes freeze store to ensure valid structure and numbers.
 */
export function normalizeFreezeStore(raw) {
  if (!raw || typeof raw !== 'object') {
    return createInitialStreakFreezeState();
  }
  return {
    availableFreezes: typeof raw.availableFreezes === 'number' ? Math.max(0, raw.availableFreezes) : DEFAULT_STREAK_FREEZE_COUNT,
    usedFreezes: Array.isArray(raw.usedFreezes) ? raw.usedFreezes : [],
    redeemedCodes: Array.isArray(raw.redeemedCodes) ? raw.redeemedCodes : [],
  };
}

/**
 * Auto-applies streak freezes to protect an active streak if the user missed
 * days (didn't log in or watch lectures) between course start/anchor date and yesterday.
 *
 * @param {object} params
 * @param {object} params.history - Daily activity history map
 * @param {string|null} params.startDate - Course start date (YYYY-MM-DD)
 * @param {object} params.freezeStore - Freeze balance state
 * @param {string} params.streakMode - 'any' or 'target'
 * @param {number} params.targetSec - Daily target in seconds
 * @param {Date|string} [params.referenceDate] - Current date reference (defaults to now)
 * @returns {{ history: object, freezeStore: object, appliedCount: number, appliedDates: string[] }}
 */
export function autoApplyStreakFreezes({
  history = {},
  startDate = null,
  freezeStore = {},
  streakMode = 'any',
  targetSec = 5400,
  referenceDate = new Date(),
}) {
  let store = normalizeFreezeStore(freezeStore);

  if (store.availableFreezes <= 0) {
    return { history, freezeStore: store, appliedCount: 0, appliedDates: [] };
  }

  const nextHistory = { ...history };
  const appliedDates = [];
  const ref = new Date(referenceDate);

  // Check from yesterday backwards
  let cursor = new Date(ref);
  cursor.setDate(cursor.getDate() - 1);

  // Find consecutive missed days immediately preceding today
  const missedDaysToProtect = [];
  while (store.availableFreezes > missedDaysToProtect.length) {
    const k = dateKey(cursor);
    if (startDate && k < startDate) break;

    const bucket = nextHistory[k];
    if (isBucketQualifying(bucket, streakMode, targetSec)) {
      // Reached an active qualifying day! Any missed days in between can be bridged.
      break;
    }

    // This is an unqualifying/missed day
    missedDaysToProtect.push({ key: k, dateObj: new Date(cursor) });
    cursor.setDate(cursor.getDate() - 1);
  }

  // Check if cursor reached an active anchor day (meaning the user has an existing streak to protect)
  const anchorKey = dateKey(cursor);
  const hasAnchor = (startDate && anchorKey < startDate)
    ? false
    : isBucketQualifying(nextHistory[anchorKey], streakMode, targetSec);

  // If there was an anchor streak before the missed days, apply the freezes
  if (hasAnchor && missedDaysToProtect.length > 0 && missedDaysToProtect.length <= store.availableFreezes) {
    for (const item of missedDaysToProtect) {
      const existing = nextHistory[item.key] || { watchedSec: 0, watchedCount: 0, lectureIds: [] };
      nextHistory[item.key] = {
        ...existing,
        isStreakFreeze: true,
        isTrialStreak: true,
        freezeNote: '🛡️ Auto-applied streak shield (missed day saved)',
      };
      appliedDates.push(item.key);
      store = {
        ...store,
        availableFreezes: Math.max(0, store.availableFreezes - 1),
        usedFreezes: [
          ...store.usedFreezes,
          {
            date: item.key,
            appliedAt: new Date().toISOString(),
            reason: 'auto_missed_day_protection',
          },
        ],
      };
    }
  }

  return {
    history: nextHistory,
    freezeStore: store,
    appliedCount: appliedDates.length,
    appliedDates,
  };
}

/**
 * Validates and redeems a promo code to award streak shields.
 *
 * @param {string} rawCode - User entered promo code
 * @param {object} freezeStore - Current freeze store
 * @returns {{ success: boolean, error?: string, addedShields?: number, label?: string, code?: string, updatedStore?: object }}
 */
export function redeemStreakPromoCode(rawCode, freezeStore = {}) {
  const store = normalizeFreezeStore(freezeStore);
  const normalized = String(rawCode || '').trim().toUpperCase();

  if (!normalized) {
    return { success: false, error: 'Please enter a valid promo code.' };
  }

  if (store.redeemedCodes.includes(normalized)) {
    return {
      success: false,
      error: `Code "${normalized}" has already been redeemed for this course.`,
    };
  }

  const promo = PROMO_CODES[normalized];
  if (!promo) {
    return {
      success: false,
      error: `Invalid promo code "${normalized}". Click "Request via Email" below to receive a code.`,
    };
  }

  const updatedStore = {
    ...store,
    availableFreezes: store.availableFreezes + promo.shields,
    redeemedCodes: [...store.redeemedCodes, normalized],
  };

  return {
    success: true,
    addedShields: promo.shields,
    label: promo.label,
    code: normalized,
    updatedStore,
  };
}

/**
 * Generates a pre-filled mailto link for requesting a promo code via email.
 *
 * @param {string} courseTitle - Name of the course
 * @returns {string} mailto URI
 */
export function getStreakPromoEmailUrl(courseTitle = 'Core Java + AI') {
  const subject = encodeURIComponent(`Request Streak Shield Promo Code - ${courseTitle}`);
  const body = encodeURIComponent(
    `Hello Support Team,\n\nI am actively studying "${courseTitle}" and would like to request a Streak Shield promo code to protect my learning streak.\n\nThank you!`
  );
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}
