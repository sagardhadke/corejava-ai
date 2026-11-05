import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for Node.js environment
const mockStorage = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] || null,
  };
})();

globalThis.localStorage = mockStorage;

import {
  recordLectureView,
  loadTrackingStore,
  saveTrackingStore,
  getTodayLearnedSec,
  isTodayLimitReached,
  getTodayRemainingCapSec,
  computeVelocityEWMA,
  computeSmartETA,
  computeCompletionSpeed,
  getActivityLog,
  getLast7DaysStats,
  formatSecToHHMM,
  clearTrackingStore,
  DAILY_LIMIT_SEC,
} from '../features/tracking/models/learningTrackerModel.js';

import {
  checkDailyLimitGate,
  buildLimitDialogContent,
  DAILY_LIMIT_HOURS,
} from '../features/tracking/models/dailyLimitModel.js';

import {
  generatePersonalizedInsights,
} from '../features/tracking/models/personalizedInsightsModel.js';

import {
  analyzeCourseBreaks,
  computeBreakAdjustedETA,
  getDetailedContentLog,
} from '../features/tracking/models/breakTrackerModel.js';

import { DEFAULT_SETTINGS } from '../features/settings/models/settingsModel.js';

describe('Real-Time Learning Tracker & 5-Hour Limit Test Suite', () => {
  const courseId = 'test-java-tracker';
  const todayKey = '2026-11-05';

  beforeEach(() => {
    mockStorage.clear();
  });

  describe('1. Tracking Data Layer & Record Storage', () => {
    it('initializes an empty tracking store with default schema', () => {
      const store = loadTrackingStore(courseId);
      assert.ok(store);
      assert.deepEqual(store.dailyLog, {});
      assert.equal(store.velocityEWMA, null);
    });

    it('records lecture viewed and updates daily bucket totals accurately', () => {
      const lecture1 = { id: 'lec_01', title: 'Java Basics', durationSec: 1800, durationLabel: '30m' };
      const updated = recordLectureView(courseId, todayKey, lecture1, true);

      assert.equal(updated.dailyLog[todayKey].totalSec, 1800);
      assert.equal(updated.dailyLog[todayKey].lectureCount, 1);
      assert.equal(updated.dailyLog[todayKey].entries.length, 1);
      assert.equal(updated.dailyLog[todayKey].entries[0].lectureId, 'lec_01');
      assert.equal(updated.dailyLog[todayKey].limitReached, false);
    });

    it('un-watching a lecture decrements today totals and never goes below zero', () => {
      const lecture = { id: 'lec_02', title: 'OOP in Java', durationSec: 2400 };
      recordLectureView(courseId, todayKey, lecture, true);
      assert.equal(getTodayLearnedSec(courseId, todayKey), 2400);

      recordLectureView(courseId, todayKey, lecture, false);
      assert.equal(getTodayLearnedSec(courseId, todayKey), 0);
      assert.equal(getTodayRemainingCapSec(courseId, todayKey), DAILY_LIMIT_SEC);
    });

    it('clears tracking store completely on demand', () => {
      recordLectureView(courseId, todayKey, { id: 'lec_03', durationSec: 3600 }, true);
      assert.equal(getTodayLearnedSec(courseId, todayKey), 3600);

      clearTrackingStore(courseId);
      assert.equal(getTodayLearnedSec(courseId, todayKey), 0);
    });
  });

  describe('2. 5-Hour Daily Limit Gate Checks', () => {
    it('allows marking watched when accumulated learning is safely below 5 hours', () => {
      // 0 seconds learned, lecture is 30m
      const gate = checkDailyLimitGate(courseId, todayKey, { id: 'lec_01', durationSec: 1800 }, true);
      assert.equal(gate.blocked, false);
    });

    it('blocks lecture when marking it would exceed 5 hours (would_exceed)', () => {
      // Setup: 4 hours 50 mins already learned (17400 sec)
      const store = loadTrackingStore(courseId);
      store.dailyLog[todayKey] = {
        totalSec: 4 * 3600 + 50 * 60, // 17400 sec
        lectureCount: 5,
        entries: [],
      };
      saveTrackingStore(courseId, store);

      // Try to watch a 20-minute lecture (1200 sec) -> total would be 5h10m (18600 > 18000)
      const gate = checkDailyLimitGate(courseId, todayKey, { id: 'lec_02', durationSec: 1200 }, true);
      assert.equal(gate.blocked, true);
      assert.equal(gate.reason, 'would_exceed');
      assert.equal(gate.limitSec, 18000);
      assert.ok(gate.remainingCapSec < 1200);
    });

    it('blocks lecture when today is already at or past the 5-hour cap (limit_reached)', () => {
      // Setup: exactly 5 hours already learned
      const store = loadTrackingStore(courseId);
      store.dailyLog[todayKey] = {
        totalSec: DAILY_LIMIT_SEC,
        lectureCount: 6,
        entries: [],
      };
      saveTrackingStore(courseId, store);

      assert.equal(isTodayLimitReached(courseId, todayKey), true);

      const gate = checkDailyLimitGate(courseId, todayKey, { id: 'lec_03', durationSec: 600 }, true);
      assert.equal(gate.blocked, true);
      assert.equal(gate.reason, 'limit_reached');
    });

    it('bypasses daily limit when tracking or limit enforcement is disabled in settings', () => {
      const store = loadTrackingStore(courseId);
      store.dailyLog[todayKey] = { totalSec: DAILY_LIMIT_SEC, lectureCount: 6, entries: [] };
      saveTrackingStore(courseId, store);

      // When trackingEnabled is false
      const gateDisabled = checkDailyLimitGate(courseId, todayKey, { id: 'lec_04', durationSec: 900 }, false);
      assert.equal(gateDisabled.blocked, false);
    });

    it('builds clear and encouraging dialog content for both limit states', () => {
      const wouldExceedGate = {
        reason: 'would_exceed',
        todayLearned: '4h 45m',
        limitLabel: '5h',
        remainingCap: '15m',
        lectureDuration: '30m',
      };
      const dialogExceed = buildLimitDialogContent(wouldExceedGate, 'Core Java');
      assert.ok(dialogExceed.headline);
      assert.ok(dialogExceed.advice.length >= 3);
      assert.ok(dialogExceed.advice.some((a) => a.includes('coding') || a.includes('practice')));

      const limitReachedGate = {
        reason: 'limit_reached',
        todayLearned: '5h',
        limitLabel: '5h',
      };
      const dialogReached = buildLimitDialogContent(limitReachedGate, 'Core Java');
      assert.ok(dialogReached.headline.includes('Outstanding'));
      assert.ok(dialogReached.tomorrow);
    });
  });

  describe('3. Learning Velocity & Smart ETA Estimation', () => {
    it('computes 7-day Exponential Weighted Moving Average (EWMA)', () => {
      const dailyLog = {
        '2026-11-01': { totalSec: 3600 },
        '2026-11-02': { totalSec: 5400 },
        '2026-11-03': { totalSec: 7200 },
      };
      const ewma = computeVelocityEWMA(dailyLog);
      assert.ok(ewma > 3600 && ewma <= 7200);
    });

    it('accurately predicts ETA based on actual learning velocity when history >= 3 days', () => {
      const dailyLog = {
        '2026-11-01': { totalSec: 7200 }, // 2 hours
        '2026-11-02': { totalSec: 7200 },
        '2026-11-03': { totalSec: 7200 },
      };
      const remainingSec = 72000; // 10 days of work at 2h/day

      const eta = computeSmartETA({
        remainingSec,
        dailyTargetSec: 3600, // settings is 1h, but velocity is 2h
        dailyLog,
        today: todayKey,
      });

      assert.equal(eta.method, 'velocity');
      assert.equal(eta.etaDays, 10);
      assert.ok(eta.etaDateStr);
    });

    it('falls back to settings target pace when user has fewer than 3 active days', () => {
      const dailyLog = {
        '2026-11-05': { totalSec: 3600 },
      };
      const remainingSec = 36000; // 10h remaining at 2h/day target = 5 days

      const eta = computeSmartETA({
        remainingSec,
        dailyTargetSec: 7200, // 2h target
        dailyLog,
        today: todayKey,
      });

      assert.equal(eta.method, 'target');
      assert.equal(eta.etaDays, 5);
      assert.equal(eta.confidence, 'low');
    });

    it('formats duration labels cleanly in standard format', () => {
      assert.equal(formatSecToHHMM(0), '0m');
      assert.equal(formatSecToHHMM(1800), '30m');
      assert.equal(formatSecToHHMM(3600), '1h');
      assert.equal(formatSecToHHMM(5400), '1h 30m');
      assert.equal(formatSecToHHMM(18000), '5h');
    });
  });

  describe('4. Local AI Personalized Insights Engine', () => {
    it('detects high-achiever pattern and provides tailored guidance', () => {
      const dailyLog = {
        '2026-10-30': { totalSec: 5400 },
        '2026-10-31': { totalSec: 5400 },
        '2026-11-01': { totalSec: 7200 },
        '2026-11-02': { totalSec: 5400 },
        '2026-11-03': { totalSec: 5400 },
        '2026-11-04': { totalSec: 5400 },
        '2026-11-05': { totalSec: 3600, lectureCount: 2 },
      };

      const insights = generatePersonalizedInsights({
        dailyLog,
        history: {},
        pct: 65,
        watchedCount: 65,
        totalCount: 100,
        streak: 7,
        remainingSec: 36000,
        today: todayKey,
        courseTitle: 'Core Java',
        aiPersonalization: true,
      });

      assert.equal(insights.enabled, true);
      assert.ok(insights.greeting.includes('7-day streak'));
      assert.ok(insights.whatNext);
      assert.ok(insights.whatToAvoid);
      assert.ok(insights.focusOn);
      assert.ok(insights.recommendations.length > 0);
    });

    it('returns empty guidance when user disables AI personalization in settings', () => {
      const insights = generatePersonalizedInsights({
        dailyLog: { '2026-11-05': { totalSec: 3600 } },
        pct: 50,
        aiPersonalization: false,
      });

      assert.equal(insights.enabled, false);
      assert.equal(insights.whatNext, null);
      assert.equal(insights.whatToAvoid, null);
      assert.equal(insights.focusOn, null);
    });
  });

  describe('5. Settings Model Tracking Defaults', () => {
    it('has trackingEnabled, dailyLimitEnabled, and aiPersonalization true by default', () => {
      assert.equal(DEFAULT_SETTINGS.trackingEnabled, true);
      assert.equal(DEFAULT_SETTINGS.dailyLimitEnabled, true);
      assert.equal(DEFAULT_SETTINGS.aiPersonalization, true);
      assert.equal(DEFAULT_SETTINGS.dailyTargetHours, 1.5);
    });
  });

  describe('6. Break Tracker & Course Progress Log Modal Data Layer', () => {
    it('analyzes break intervals and consistency ratio across calendar days', () => {
      const dailyLog = {
        '2026-11-01': { totalSec: 3600 },
        '2026-11-02': { totalSec: 5400 },
        // 2026-11-03: BREAK DAY
        // 2026-11-04: BREAK DAY
        '2026-11-05': { totalSec: 7200 },
      };

      const analysis = analyzeCourseBreaks({
        dailyLog,
        history: {},
        startDate: '2026-11-01',
        today: '2026-11-05',
      });

      assert.equal(analysis.totalCalendarDays, 5);
      assert.equal(analysis.totalStudyDays, 3);
      assert.equal(analysis.totalBreakDays, 2);
      assert.equal(analysis.consistencyRatio, 0.6); // 3 / 5
      assert.equal(analysis.consistencyPct, 60);
      assert.equal(analysis.isActiveToday, true);

      // Verify break interval
      assert.equal(analysis.breakIntervals.length, 1);
      const b = analysis.breakIntervals[0];
      assert.equal(b.startDate, '2026-11-03');
      assert.equal(b.endDate, '2026-11-04');
      assert.equal(b.durationDays, 2);
      assert.equal(b.resumedOn, '2026-11-05');
    });

    it('computes fast-track vs realistic break-adjusted completion dates and days saved', () => {
      const eta = computeBreakAdjustedETA({
        remainingSec: 72000, // 20 hours
        effectiveVelocity: 7200, // 2 hours/day -> 10 active study days needed
        consistencyRatio: 0.5, // Studies 1 day out of every 2 -> realistic = 20 days
        today: '2026-11-05',
      });

      assert.equal(eta.fastTrackDays, 10);
      assert.equal(eta.realisticDays, 20);
      assert.equal(eta.daysSaved, 10);
      assert.ok(eta.fastTrackDateStr);
      assert.ok(eta.realisticDateStr);
      assert.ok(eta.accelerationAdvice.includes('Fast-Track Opportunity'));
      assert.ok(eta.accelerationAdvice.includes('10 calendar days'));
    });

    it('extracts detailed content log with formatted times and reverse-chronological ordering', () => {
      const dailyLog = {
        '2026-11-04': {
          entries: [
            { lectureId: 'l1', lectureTitle: 'Introduction', durationSec: 600, viewedAt: '2026-11-04T09:15:00.000Z' },
          ],
        },
        '2026-11-05': {
          entries: [
            { lectureId: 'l2', lectureTitle: 'Variables', durationSec: 1200, viewedAt: '2026-11-05T14:30:00.000Z' },
          ],
        },
      };

      const log = getDetailedContentLog(dailyLog);
      assert.equal(log.length, 2);
      // Newest date first
      assert.equal(log[0].lectureId, 'l2');
      assert.equal(log[0].dateKey, '2026-11-05');
      assert.ok(log[0].formattedTime);
      assert.equal(log[1].lectureId, 'l1');
      assert.equal(log[1].dateKey, '2026-11-04');
    });
  });
});

