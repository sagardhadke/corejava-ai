/**
 * Unit Tests: Domain Models — Pure Logic
 * Covers: courseProgressModel, streakModel, todayPlanModel, learningTrackerModel
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeCourseStats,
  computeSectionProgress,
  computeFirstWatchedDate,
  computeEffectiveStartDate,
  filterCourseSections,
  buildLectureLookup,
} from './courseProgressModel.js';
import {
  computeCurrentStreak,
  computeLongestStreak,
  isBucketQualifying,
} from '../../streak/models/streakModel.js';
import {
  computeAutoPlanIds,
  computePlanStats,
} from '../../today-plan/models/todayPlanModel.js';
import {
  computeVelocityEWMA,
  computeSmartETA,
  formatSecToHHMM,
  DAILY_LIMIT_SEC,
} from '../../tracking/models/learningTrackerModel.js';

// ----- Fixtures -----

const LECTURES = [
  { id: 'l1', durationSec: 1200 },
  { id: 'l2', durationSec: 900 },
  { id: 'l3', durationSec: 1800 },
  { id: 'l4', durationSec: 600 },
  { id: 'l5', durationSec: 2400 },
];

const COURSE = {
  id: 'test',
  title: 'Test Course',
  sections: [
    {
      id: 'sec-1',
      number: '01',
      title: 'Java Basics',
      lectures: [LECTURES[0], LECTURES[1]],
    },
    {
      id: 'sec-2',
      number: '02',
      title: 'OOP Concepts',
      lectures: [LECTURES[2], LECTURES[3], LECTURES[4]],
    },
  ],
};

// ----- computeCourseStats -----

describe('computeCourseStats', () => {
  it('returns zero stats for empty inputs', () => {
    const result = computeCourseStats([], new Set(), new Set());
    expect(result.watchedCount).toBe(0);
    expect(result.totalCount).toBe(0);
    expect(result.pct).toBe(0);
  });

  it('calculates correct stats with some lectures watched', () => {
    const result = computeCourseStats(LECTURES, new Set(['l1', 'l2']), new Set());
    expect(result.watchedCount).toBe(2);
    expect(result.totalCount).toBe(5);
    expect(result.pct).toBe(40); // Math.round(2/5*100)
    expect(result.watchedSec).toBe(2100); // 1200+900
  });

  it('calculates 100% when all watched', () => {
    const allIds = new Set(LECTURES.map((l) => l.id));
    const result = computeCourseStats(LECTURES, allIds, new Set());
    expect(result.pct).toBe(100);
    expect(result.watchedCount).toBe(5);
  });

  it('computes planned stats correctly', () => {
    const result = computeCourseStats(
      LECTURES,
      new Set(['l1']),      // l1 watched
      new Set(['l1', 'l2']) // l1 + l2 planned
    );
    expect(result.plannedCount).toBe(2);
    expect(result.plannedWatchedCount).toBe(1);
    expect(result.plannedSec).toBe(2100); // 1200+900
    expect(result.plannedWatchedSec).toBe(1200);
  });

  it('handles undefined/null gracefully', () => {
    const result = computeCourseStats(undefined, undefined, undefined);
    expect(result.pct).toBe(0);
  });
});

// ----- computeSectionProgress -----

describe('computeSectionProgress', () => {
  it('returns empty array for null course', () => {
    expect(computeSectionProgress(null, new Set())).toEqual([]);
  });

  it('returns correct progress for each section', () => {
    const progress = computeSectionProgress(COURSE, new Set(['l1']));
    expect(progress).toHaveLength(2);
    expect(progress[0].watchedCount).toBe(1);
    expect(progress[0].total).toBe(2);
    expect(progress[0].isComplete).toBe(false);
    expect(progress[1].watchedCount).toBe(0);
    expect(progress[1].total).toBe(3);
  });

  it('marks section as complete when all lectures watched', () => {
    const progress = computeSectionProgress(COURSE, new Set(['l1', 'l2']));
    expect(progress[0].isComplete).toBe(true);
    expect(progress[1].isComplete).toBe(false);
  });
});

// ----- computeFirstWatchedDate -----

describe('computeFirstWatchedDate', () => {
  it('returns null for empty history', () => {
    expect(computeFirstWatchedDate({})).toBeNull();
  });

  it('returns earliest date with watchedCount > 0', () => {
    const history = {
      '2026-01-10': { watchedCount: 2 },
      '2026-01-05': { watchedCount: 1 },
      '2026-01-15': { watchedCount: 3 },
    };
    expect(computeFirstWatchedDate(history)).toBe('2026-01-05');
  });

  it('ignores days with zero watchedCount', () => {
    const history = {
      '2026-01-01': { watchedCount: 0 },
      '2026-01-10': { watchedCount: 1 },
    };
    expect(computeFirstWatchedDate(history)).toBe('2026-01-10');
  });

  it('detects first date from lectureIds array when watchedCount missing', () => {
    const history = {
      '2026-01-07': { lectureIds: ['l1'] },
    };
    expect(computeFirstWatchedDate(history)).toBe('2026-01-07');
  });
});

// ----- computeEffectiveStartDate -----

describe('computeEffectiveStartDate', () => {
  it('returns manual date when isStartDateManual is true', () => {
    const result = computeEffectiveStartDate({
      isStartDateManual: true,
      storedStartDate: '2026-01-01',
      firstWatchedDate: '2026-05-01',
      today: '2026-11-06',
    });
    expect(result).toBe('2026-01-01');
  });

  it('returns firstWatchedDate when not manual', () => {
    const result = computeEffectiveStartDate({
      isStartDateManual: false,
      storedStartDate: null,
      firstWatchedDate: '2026-05-01',
      today: '2026-11-06',
    });
    expect(result).toBe('2026-05-01');
  });

  it('falls back to today when no history and no manual date', () => {
    const result = computeEffectiveStartDate({
      isStartDateManual: false,
      storedStartDate: null,
      firstWatchedDate: null,
      today: '2026-11-06',
    });
    expect(result).toBe('2026-11-06');
  });
});

// ----- filterCourseSections -----

describe('filterCourseSections', () => {
  const sections = [
    {
      id: 's1',
      title: 'Java Basics',
      lectures: [
        { id: 'l1', title: 'Introduction to Java' },
        { id: 'l2', title: 'Variables and Types' },
      ],
    },
    {
      id: 's2',
      title: 'OOP Concepts',
      lectures: [
        { id: 'l3', title: 'Classes and Objects' },
        { id: 'l4', title: 'Inheritance' },
      ],
    },
  ];

  it('returns all sections when query is empty', () => {
    expect(filterCourseSections(sections, '')).toHaveLength(2);
  });

  it('returns matching sections by section title', () => {
    const result = filterCourseSections(sections, 'basics');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('s1');
  });

  it('returns section with filtered lectures when lecture title matches', () => {
    const result = filterCourseSections(sections, 'inheritance');
    expect(result).toHaveLength(1);
    expect(result[0].lectures).toHaveLength(1);
    expect(result[0].lectures[0].title).toBe('Inheritance');
  });

  it('returns empty array when no matches', () => {
    expect(filterCourseSections(sections, 'python')).toHaveLength(0);
  });

  it('is case-insensitive', () => {
    expect(filterCourseSections(sections, 'JAVA')).toHaveLength(1);
  });

  it('trims whitespace from query', () => {
    expect(filterCourseSections(sections, '  java  ')).toHaveLength(1);
  });
});

// ----- buildLectureLookup -----

describe('buildLectureLookup', () => {
  it('returns empty map for null course', () => {
    expect(buildLectureLookup(null).size).toBe(0);
  });

  it('assigns 1-based global numbers to all lectures', () => {
    const lookup = buildLectureLookup(COURSE);
    expect(lookup.get('l1')?.globalNumber).toBe(1);
    expect(lookup.get('l2')?.globalNumber).toBe(2);
    expect(lookup.get('l3')?.globalNumber).toBe(3);
  });

  it('maps lecture to its section correctly', () => {
    const lookup = buildLectureLookup(COURSE);
    expect(lookup.get('l3')?.sectionId).toBe('sec-2');
  });
});

// ----- Streak Model -----

describe('isBucketQualifying', () => {
  it('returns false for null/undefined bucket', () => {
    expect(isBucketQualifying(null)).toBe(false);
    expect(isBucketQualifying(undefined)).toBe(false);
  });

  it('returns true for practice day', () => {
    expect(isBucketQualifying({ isPractice: true })).toBe(true);
  });

  it('returns true for streak freeze day', () => {
    expect(isBucketQualifying({ isStreakFreeze: true })).toBe(true);
  });

  it('returns true in "any" mode when watchedCount > 0', () => {
    expect(isBucketQualifying({ watchedCount: 1 }, 'any', 5400)).toBe(true);
  });

  it('returns false in "any" mode when watchedCount is 0', () => {
    expect(isBucketQualifying({ watchedCount: 0 }, 'any', 5400)).toBe(false);
  });

  it('returns true in "target" mode when watchedSec >= targetSec', () => {
    expect(isBucketQualifying({ watchedSec: 5400 }, 'target', 5400)).toBe(true);
  });

  it('returns false in "target" mode when watchedSec < targetSec', () => {
    expect(isBucketQualifying({ watchedSec: 1000 }, 'target', 5400)).toBe(false);
  });
});

describe('computeLongestStreak', () => {
  it('returns 0 for empty history', () => {
    expect(computeLongestStreak({})).toBe(0);
  });

  it('computes streak for consecutive qualifying days', () => {
    const history = {
      '2026-01-01': { watchedCount: 1 },
      '2026-01-02': { watchedCount: 1 },
      '2026-01-03': { watchedCount: 1 },
      '2026-01-05': { watchedCount: 1 }, // gap breaks streak
    };
    expect(computeLongestStreak(history)).toBe(3);
  });

  it('detects longest streak even when split by zero days', () => {
    const history = {
      '2026-01-01': { watchedCount: 1 },
      '2026-01-02': { watchedCount: 0 }, // breaks streak
      '2026-01-03': { watchedCount: 1 },
      '2026-01-04': { watchedCount: 1 },
      '2026-01-05': { watchedCount: 1 },
      '2026-01-06': { watchedCount: 1 },
    };
    expect(computeLongestStreak(history)).toBe(4);
  });
});

// ----- computeAutoPlanIds -----

describe('computeAutoPlanIds', () => {
  it('returns empty when all lectures are watched', () => {
    const watched = new Set(['l1', 'l2', 'l3', 'l4', 'l5']);
    expect(computeAutoPlanIds(5400, watched, LECTURES)).toHaveLength(0);
  });

  it('fills plan up to targetSec without exceeding it unnecessarily', () => {
    // targetSec = 1200+900 = 2100 exactly → should include l1, l2 and stop
    const ids = computeAutoPlanIds(2100, new Set(), LECTURES);
    expect(ids).toContain('l1');
    expect(ids).toContain('l2');
    // l3 (1800s) would push us over if we already hit the target
    // The model breaks once sum >= targetSec
    const totalSec = ids.reduce((s, id) => s + (LECTURES.find(l => l.id === id)?.durationSec || 0), 0);
    expect(totalSec).toBeGreaterThanOrEqual(2100);
  });

  it('skips watched lectures', () => {
    const ids = computeAutoPlanIds(99999, new Set(['l1', 'l2']), LECTURES);
    expect(ids).not.toContain('l1');
    expect(ids).not.toContain('l2');
  });
});

// ----- learningTrackerModel -----

describe('formatSecToHHMM', () => {
  it('returns "0m" for 0 or negative', () => {
    expect(formatSecToHHMM(0)).toBe('0m');
    expect(formatSecToHHMM(-1)).toBe('0m');
  });

  it('formats minutes only when < 1 hour', () => {
    expect(formatSecToHHMM(1800)).toBe('30m');
    expect(formatSecToHHMM(900)).toBe('15m');
  });

  it('formats hours only when no remaining minutes', () => {
    expect(formatSecToHHMM(3600)).toBe('1h');
  });

  it('formats hours and minutes', () => {
    expect(formatSecToHHMM(5400)).toBe('1h 30m');
    expect(formatSecToHHMM(7200)).toBe('2h');
  });
});

describe('DAILY_LIMIT_SEC constant', () => {
  it('is exactly 5 hours (18000 seconds)', () => {
    expect(DAILY_LIMIT_SEC).toBe(18000);
  });
});

describe('computeVelocityEWMA', () => {
  it('returns 0 for empty log', () => {
    expect(computeVelocityEWMA({})).toBe(0);
  });

  it('returns single day value when only one day', () => {
    expect(computeVelocityEWMA({ '2026-01-01': { totalSec: 3600 } })).toBe(3600);
  });

  it('applies exponential decay (more recent = more weight)', () => {
    const log = {
      '2026-01-01': { totalSec: 1000 },
      '2026-01-02': { totalSec: 5000 },
    };
    const ewma = computeVelocityEWMA(log);
    // With alpha=0.4: ewma = 0.4*5000 + 0.6*1000 = 2000+600 = 2600
    expect(ewma).toBe(2600);
  });
});

describe('computeSmartETA', () => {
  it('returns "Already complete" when remainingSec is 0', () => {
    const result = computeSmartETA({
      remainingSec: 0,
      dailyTargetSec: 5400,
      dailyLog: {},
      today: '2026-11-06',
    });
    expect(result.etaDays).toBe(0);
    expect(result.etaDateStr).toBe('Already complete');
  });

  it('uses target-based method when fewer than 3 active days', () => {
    const result = computeSmartETA({
      remainingSec: 10800, // 3h remaining
      dailyTargetSec: 3600, // 1h/day target → ETA 3 days
      dailyLog: { '2026-01-01': { totalSec: 3600 } }, // only 1 day
      today: '2026-11-06',
    });
    expect(result.method).toBe('target');
    expect(result.etaDays).toBe(3);
  });

  it('uses velocity-based method when >= 3 active days', () => {
    const log = {
      '2026-01-01': { totalSec: 3600 },
      '2026-01-02': { totalSec: 3600 },
      '2026-01-03': { totalSec: 3600 },
    };
    const result = computeSmartETA({
      remainingSec: 7200,
      dailyTargetSec: 1800, // lower target, should use velocity
      dailyLog: log,
      today: '2026-11-06',
    });
    expect(result.method).toBe('velocity');
  });
});
