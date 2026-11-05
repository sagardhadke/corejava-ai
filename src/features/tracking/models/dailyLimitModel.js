/**
 * Daily Limit Enforcement Model (Pure Domain Logic)
 * Enforces the 5-hour daily learning cap with smart gate checks.
 * Prevents users from marking all content as complete in one go.
 */

import { DAILY_LIMIT_SEC, getTodayLearnedSec, getTodayRemainingCapSec } from './learningTrackerModel.js';
import { formatSecToHHMM } from './learningTrackerModel.js';

export const DAILY_LIMIT_HOURS = 5;

/**
 * Determines whether marking a lecture as watched should be BLOCKED
 * because it would push the user over the 5-hour daily limit.
 *
 * Returns:
 *   { blocked: false } — allow
 *   { blocked: true, reason, todayLearned, lectureDuration, limitSec, remainingCap } — deny with dialog info
 */
export function checkDailyLimitGate(courseId, dateKey, lecture, trackingEnabled) {
  // If tracking is disabled, never block
  if (!trackingEnabled) return { blocked: false };

  const lectureSec = lecture?.durationSec || 0;
  const todayLearnedSec = getTodayLearnedSec(courseId, dateKey);
  const remainingCapSec = getTodayRemainingCapSec(courseId, dateKey);

  // If user is UN-marking a lecture, never block
  // (the caller only calls this when isWatched is about to become true)

  // Already at or past limit
  if (todayLearnedSec >= DAILY_LIMIT_SEC) {
    return {
      blocked: true,
      reason: 'limit_reached',
      todayLearned: formatSecToHHMM(todayLearnedSec),
      todayLearnedSec,
      limitSec: DAILY_LIMIT_SEC,
      limitLabel: formatSecToHHMM(DAILY_LIMIT_SEC),
      lectureDuration: formatSecToHHMM(lectureSec),
      lectureDurationSec: lectureSec,
      remainingCap: formatSecToHHMM(remainingCapSec),
      remainingCapSec,
    };
  }

  // This lecture would push user over the limit
  if (todayLearnedSec + lectureSec > DAILY_LIMIT_SEC && lectureSec > 0) {
    return {
      blocked: true,
      reason: 'would_exceed',
      todayLearned: formatSecToHHMM(todayLearnedSec),
      todayLearnedSec,
      limitSec: DAILY_LIMIT_SEC,
      limitLabel: formatSecToHHMM(DAILY_LIMIT_SEC),
      lectureDuration: formatSecToHHMM(lectureSec),
      lectureDurationSec: lectureSec,
      remainingCap: formatSecToHHMM(remainingCapSec),
      remainingCapSec,
    };
  }

  return { blocked: false };
}

/**
 * Builds a personalized message for the daily limit dialog based on context.
 */
export function buildLimitDialogContent(gateResult, courseTitle = 'your course') {
  const { reason, todayLearned, limitLabel, remainingCap, lectureDuration } = gateResult;

  if (reason === 'limit_reached') {
    return {
      headline: `🎉 Outstanding focus today!`,
      subheadline: `You've completed ${todayLearned} of learning today`,
      body: `You've already hit your ${limitLabel} daily learning limit for ${courseTitle}. Your brain needs time to consolidate what you've learned before moving on.`,
      advice: [
        '✅ Review today\'s notes and code examples',
        '💻 Practice coding exercises from today\'s lectures',
        '🧠 Take a short break — spaced repetition works best overnight',
        '📝 Write down key concepts from memory',
        '🔄 Come back tomorrow to continue with the remaining content',
      ],
      tomorrow: `Tomorrow you can continue with the locked content. Rest and practice today!`,
      ctaLabel: 'Got it — I\'ll practice now',
      ctaSecondary: 'View today\'s activity',
    };
  }

  // reason === 'would_exceed'
  return {
    headline: `⚡ Almost at today's limit`,
    subheadline: `${todayLearned} learned · ${remainingCap} remaining · This lecture is ${lectureDuration}`,
    body: `Marking this lecture would push you over your ${limitLabel} daily learning limit. Your brain absorbs new content most effectively in focused sessions with recovery time between them.`,
    advice: [
      '💻 Apply what you\'ve learned so far with hands-on coding',
      '📖 Re-read notes from earlier lectures today',
      '🧪 Try the exercises from previous lectures',
      '🔄 Resume tomorrow — the remaining content will be waiting',
    ],
    tomorrow: `You have ${remainingCap} left in today's cap. This lecture (${lectureDuration}) is too long to fit — continue tomorrow for the best learning outcome.`,
    ctaLabel: 'Practice what I know today',
    ctaSecondary: 'View my progress',
  };
}
