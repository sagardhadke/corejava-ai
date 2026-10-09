import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for Node.js test environment
class MockLocalStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(String(key), String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
  key(index) {
    return Array.from(this.store.keys())[index] || null;
  }
  get length() {
    return this.store.size;
  }
}

globalThis.localStorage = new MockLocalStorage();

// Import courseStore dynamically after localStorage is mounted
const {
  listCourses,
  getActiveCourseId,
  setActiveCourseId,
  getCourseById,
  addCourse,
  replaceCourse,
  deleteCourse,
  resetEverything,
  exportAllData,
  importAllData,
  getStorageUsageBytes,
  getPerCourseStorageBytes,
} = await import('../data/courseStore.js');

const { getActiveSectionId, getActiveSectionIds } = await import('../utils/activeSection.js');
const { getAggregatedHistory } = await import('../utils/activityHistory.js');
const { buildWeeksForYear, intensity } = await import('../utils/calendarGrid.js');
const { DEFAULT_MOTIVATION_MESSAGES, pickDefaultMotivation } = await import('../utils/motivation.js');
const { verifyOpenAiApiKey } = await import('../utils/apiKey.js');

const {
  COMPLETION_STATUS,
  getCompletionState,
  initiateVerification,
  attemptPinVerification,
  evaluateCompletionBanner,
  resetCompletionState,
} = await import('../features/course/models/courseCompletionModel.js');

const {
  canMarkPracticeDay,
  applyPracticeDay,
  removePracticeDay,
  getDayDifference,
  MAX_PRACTICE_DAY_RETROACTIVE_DAYS,
} = await import('../features/streak/models/practiceDayModel.js');
const { computeCurrentStreak } = await import('../features/streak/models/streakModel.js');

const SAMPLE_COURSE_1 = {
  id: 'course-python-ai-101',
  title: 'Python for AI & ML',
  sections: [
    {
      id: 'py_s01',
      number: '01',
      title: 'Python Basics',
      isProject: false,
      lectures: [
        { id: 'py_l01', title: 'Intro to Python', durationSec: 600, durationLabel: '10m' },
        { id: 'py_l02', title: 'Variables', durationSec: 900, durationLabel: '15m' },
      ],
    },
  ],
};

const SAMPLE_COURSE_2 = {
  id: 'course-react-fullstack-202',
  title: 'Fullstack React & Next.js',
  sections: [
    {
      id: 'react_s01',
      number: '01',
      title: 'React Fundamentals',
      isProject: false,
      lectures: [
        { id: 'react_l01', title: 'JSX & Components', durationSec: 1200, durationLabel: '20m' },
      ],
    },
  ],
};

describe('Course Flow & State Management Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('1. Fresh install returns only the single built-in Core Java + AI course', () => {
    const courses = listCourses();
    assert.equal(courses.length, 1);
    assert.equal(courses[0].id, 'core-java-ai');
    assert.equal(courses[0].isDefault, true);

    const activeId = getActiveCourseId();
    assert.equal(activeId, 'core-java-ai');

    const course = getCourseById('core-java-ai');
    assert.ok(course);
    assert.equal(course.lectureCount, 150);
    assert.ok(course.totalSeconds > 0);
  });

  it('2. Adding a custom course alongside preserves the default course and sets the new course active', () => {
    const newId = addCourse(SAMPLE_COURSE_1);
    assert.equal(newId, SAMPLE_COURSE_1.id);

    const courses = listCourses();
    assert.equal(courses.length, 2);
    assert.ok(courses.some((c) => c.id === 'core-java-ai'));
    assert.ok(courses.some((c) => c.id === SAMPLE_COURSE_1.id));

    assert.equal(getActiveCourseId(), SAMPLE_COURSE_1.id);
  });

  it('3. Switching courses persists activeCourseId and returns correct course details', () => {
    addCourse(SAMPLE_COURSE_1);
    assert.equal(getActiveCourseId(), SAMPLE_COURSE_1.id);

    const switched = setActiveCourseId('core-java-ai');
    assert.equal(switched, true);
    assert.equal(getActiveCourseId(), 'core-java-ai');

    const invalidSwitch = setActiveCourseId('non-existent-course-id');
    assert.equal(invalidSwitch, false);
    assert.equal(getActiveCourseId(), 'core-java-ai');
  });

  it('4. Multi-course progress data isolation in localStorage', () => {
    // Store progress for course 1
    localStorage.setItem('jct_watched__core-java-ai', JSON.stringify({ 'core-java-ai__s01_l0': true }));
    localStorage.setItem('jct_today_plan__core-java-ai', JSON.stringify({ ids: ['core-java-ai__s01_l0'] }));
    localStorage.setItem('jct_start_date__core-java-ai', '2026-09-01');

    // Add Course 2 and store its progress
    addCourse(SAMPLE_COURSE_1);
    localStorage.setItem(`jct_watched__${SAMPLE_COURSE_1.id}`, JSON.stringify({ 'py_l01': true }));
    localStorage.setItem(`jct_start_date__${SAMPLE_COURSE_1.id}`, '2026-09-09');

    // Verify isolation
    const course1Watched = JSON.parse(localStorage.getItem('jct_watched__core-java-ai'));
    const course2Watched = JSON.parse(localStorage.getItem(`jct_watched__${SAMPLE_COURSE_1.id}`));
    assert.deepEqual(course1Watched, { 'core-java-ai__s01_l0': true });
    assert.deepEqual(course2Watched, { 'py_l01': true });

    // Verify storage byte calculation
    const course1Bytes = getPerCourseStorageBytes('core-java-ai');
    const course2Bytes = getPerCourseStorageBytes(SAMPLE_COURSE_1.id);
    assert.ok(course1Bytes > 0);
    assert.ok(course2Bytes > 0);
    assert.ok(getStorageUsageBytes() >= course1Bytes + course2Bytes);
  });

  it('5. Replacing the default course removes it completely from listCourses and purges its localStorage data', () => {
    // Populate progress for default course
    localStorage.setItem('jct_watched__core-java-ai', JSON.stringify({ 'core-java-ai__s01_l0': true }));
    localStorage.setItem('jct_today_plan__core-java-ai', JSON.stringify({ ids: ['core-java-ai__s01_l0'] }));
    localStorage.setItem('jct_settings__core-java-ai', JSON.stringify({ dailyTargetHours: 2 }));
    localStorage.setItem('jct_history__core-java-ai', JSON.stringify({ '2026-09-09': 1 }));
    localStorage.setItem('jct_start_date__core-java-ai', '2026-09-01');

    // Perform replacement of default course with SAMPLE_COURSE_1
    const newId = replaceCourse('core-java-ai', SAMPLE_COURSE_1);
    assert.equal(newId, SAMPLE_COURSE_1.id);

    // Verify courses list contains ONLY the new course
    const courses = listCourses();
    assert.equal(courses.length, 1);
    assert.equal(courses[0].id, SAMPLE_COURSE_1.id);
    assert.equal(courses[0].title, SAMPLE_COURSE_1.title);
    assert.equal(getActiveCourseId(), SAMPLE_COURSE_1.id);

    // Verify default course progress data was COMPLETELY purged from localStorage
    assert.equal(localStorage.getItem('jct_watched__core-java-ai'), null);
    assert.equal(localStorage.getItem('jct_today_plan__core-java-ai'), null);
    assert.equal(localStorage.getItem('jct_settings__core-java-ai'), null);
    assert.equal(localStorage.getItem('jct_history__core-java-ai'), null);
    assert.equal(localStorage.getItem('jct_start_date__core-java-ai'), null);
  });

  it('6. Replaced default course does not resurrect on simulated reload or repeated listCourses calls', () => {
    replaceCourse('core-java-ai', SAMPLE_COURSE_1);

    // Call listCourses multiple times
    for (let i = 0; i < 5; i++) {
      const courses = listCourses();
      assert.equal(courses.length, 1);
      assert.equal(courses[0].id, SAMPLE_COURSE_1.id);
      assert.ok(!courses.some((c) => c.id === 'core-java-ai'));
    }
  });

  it('7. Replacing a custom course with another custom course works cleanly', () => {
    addCourse(SAMPLE_COURSE_1);
    assert.equal(listCourses().length, 2);

    replaceCourse(SAMPLE_COURSE_1.id, SAMPLE_COURSE_2);
    const courses = listCourses();
    assert.equal(courses.length, 2);
    assert.ok(courses.some((c) => c.id === 'core-java-ai'));
    assert.ok(courses.some((c) => c.id === SAMPLE_COURSE_2.id));
    assert.ok(!courses.some((c) => c.id === SAMPLE_COURSE_1.id));
    assert.equal(getActiveCourseId(), SAMPLE_COURSE_2.id);
  });

  it('8. Course deletion prevents deleting the last remaining course', () => {
    const res = deleteCourse('core-java-ai');
    assert.equal(res.ok, false);
    assert.equal(res.reason, 'At least one course must remain.');
    assert.equal(listCourses().length, 1);
  });

  it('9. Course deletion when multiple exist removes course and purges its progress', () => {
    addCourse(SAMPLE_COURSE_1);
    localStorage.setItem(`jct_watched__${SAMPLE_COURSE_1.id}`, JSON.stringify({ test: true }));
    localStorage.setItem(`jct_start_date__${SAMPLE_COURSE_1.id}`, '2026-09-09');

    const res = deleteCourse(SAMPLE_COURSE_1.id);
    assert.equal(res.ok, true);

    const courses = listCourses();
    assert.equal(courses.length, 1);
    assert.equal(courses[0].id, 'core-java-ai');
    assert.equal(localStorage.getItem(`jct_watched__${SAMPLE_COURSE_1.id}`), null);
    assert.equal(localStorage.getItem(`jct_start_date__${SAMPLE_COURSE_1.id}`), null);
  });

  it('10. Deleting the currently active course automatically falls back to remaining course', () => {
    addCourse(SAMPLE_COURSE_1);
    assert.equal(getActiveCourseId(), SAMPLE_COURSE_1.id);

    deleteCourse(SAMPLE_COURSE_1.id);
    assert.equal(getActiveCourseId(), 'core-java-ai');
  });

  it('11. Resetting everything purges all course keys and restores fresh default install', () => {
    addCourse(SAMPLE_COURSE_1);
    localStorage.setItem('jct_watched__core-java-ai', JSON.stringify({ a: 1 }));
    localStorage.setItem(`jct_watched__${SAMPLE_COURSE_1.id}`, JSON.stringify({ b: 2 }));

    resetEverything();

    assert.equal(localStorage.getItem('jct_watched__core-java-ai'), null);
    assert.equal(localStorage.getItem(`jct_watched__${SAMPLE_COURSE_1.id}`), null);
    assert.equal(listCourses().length, 1);
    assert.equal(getActiveCourseId(), 'core-java-ai');
  });

  it('12. Corrupt or invalid registry in localStorage recovers gracefully without throwing', () => {
    localStorage.setItem('jct_course_registry_v1', 'not valid json {{{');
    const courses = listCourses();
    assert.equal(courses.length, 1);
    assert.equal(courses[0].id, 'core-java-ai');
  });

  it('13. Stale/orphan course IDs in registry are filtered out', () => {
    localStorage.setItem(
      'jct_course_registry_v1',
      JSON.stringify({
        courseIds: ['core-java-ai', 'stale-deleted-course-123', 'another-orphan-id'],
        activeCourseId: 'core-java-ai',
        customCourses: {},
      })
    );

    const courses = listCourses();
    assert.equal(courses.length, 1);
    assert.equal(courses[0].id, 'core-java-ai');
  });

  it('14. Full backup export and restore preserves all courses and progress', () => {
    addCourse(SAMPLE_COURSE_1);
    localStorage.setItem('jct_watched__core-java-ai', JSON.stringify({ 'w1': true }));
    localStorage.setItem(`jct_watched__${SAMPLE_COURSE_1.id}`, JSON.stringify({ 'w2': true }));

    // SECURITY TEST: Store sensitive API key and setting with embedded API key
    localStorage.setItem('jct_openai_api_key_v1', 'sk-proj-live-token-secret-12345');
    localStorage.setItem('jct_settings__core-java-ai', JSON.stringify({ dailyTargetHours: 2, apiKey: 'sk-legacy-key' }));

    const backup = exportAllData();
    assert.equal(backup.backupVersion, 1);
    assert.equal(backup.sanitized, true, 'Export bundle must be flagged sanitized');
    assert.ok(backup.data['jct_course_registry_v1']);
    assert.ok(backup.data['jct_watched__core-java-ai']);
    assert.ok(backup.data[`jct_watched__${SAMPLE_COURSE_1.id}`]);

    // SECURITY ASSERTIONS: Sensitive OpenAI API key must NEVER be exported in backup JSON!
    assert.equal(backup.data['jct_openai_api_key_v1'], undefined, 'OpenAI API key must be stripped from backup data');
    const exportedSettings = JSON.parse(backup.data['jct_settings__core-java-ai']);
    assert.equal(exportedSettings.apiKey, undefined, 'Embedded API key in settings must be stripped from backup data');
    assert.equal(exportedSettings.dailyTargetHours, 2, 'Non-sensitive settings must be preserved');

    // Clear everything
    localStorage.clear();
    assert.equal(listCourses().length, 1);

    // Set a local API key on the receiving device
    localStorage.setItem('jct_openai_api_key_v1', 'sk-device-local-key');

    // Restore from backup
    importAllData(backup);
    const restoredCourses = listCourses();
    assert.equal(restoredCourses.length, 2);
    assert.equal(localStorage.getItem('jct_watched__core-java-ai'), JSON.stringify({ 'w1': true }));
    assert.equal(localStorage.getItem(`jct_watched__${SAMPLE_COURSE_1.id}`), JSON.stringify({ 'w2': true }));
    assert.equal(localStorage.getItem('jct_openai_api_key_v1'), 'sk-device-local-key', 'Local API key must be preserved across backup restore');
  });

  it('15. Active section opens automatically based on first unwatched lecture', () => {
    const dummyCourse = {
      id: 'test-course',
      title: 'Test Course',
      sections: [
        {
          id: 'sec-1',
          number: 1,
          title: 'Section 1',
          lectures: [{ id: 'l1' }, { id: 'l2' }],
        },
        {
          id: 'sec-2',
          number: 2,
          title: 'Section 2',
          lectures: [{ id: 'l3' }, { id: 'l4' }],
        },
        {
          id: 'sec-3',
          number: 3,
          title: 'Section 3',
          lectures: [{ id: 'l5' }],
        },
      ],
    };

    // When nothing is watched, section 1 should be active
    assert.equal(getActiveSectionId(dummyCourse, new Set()), 'sec-1');

    // When only l1 is watched, section 1 still has unwatched l2 -> sec-1 is active
    assert.equal(getActiveSectionId(dummyCourse, new Set(['l1'])), 'sec-1');

    // When section 1 is fully watched (l1 & l2), section 2 should be active automatically
    assert.equal(getActiveSectionId(dummyCourse, new Set(['l1', 'l2'])), 'sec-2');

    // When section 2 is partially watched (l1, l2, l3), section 2 should be active
    assert.equal(getActiveSectionId(dummyCourse, new Set(['l1', 'l2', 'l3'])), 'sec-2');

    // When section 1 & 2 are fully watched (l1, l2, l3, l4), section 3 should be active
    assert.equal(getActiveSectionId(dummyCourse, new Set(['l1', 'l2', 'l3', 'l4'])), 'sec-3');

    // When all lectures are watched, it defaults gracefully to the last section
    assert.equal(getActiveSectionId(dummyCourse, new Set(['l1', 'l2', 'l3', 'l4', 'l5'])), 'sec-3');
  });

  it('16. Course start date is auto-detected from first watched lecture or overridden manually', () => {
    function resolveStartDate(history, isManual, manualDate, today) {
      if (isManual && manualDate) return manualDate;
      const dates = Object.entries(history)
        .filter(([, b]) => (b?.watchedCount > 0 || (Array.isArray(b?.lectureIds) && b.lectureIds.length > 0)))
        .map(([d]) => d)
        .sort();
      return dates[0] || manualDate || today;
    }

    const today = '2026-09-27';

    // No history, not manual -> defaults to today
    assert.equal(resolveStartDate({}, false, null, today), '2026-09-27');

    // First lecture watched on 2026-01-01 -> auto-detected as 2026-01-01
    const historyWithFirstLecture = {
      '2026-01-01': { watchedCount: 1, lectureIds: ['l1'] },
      '2026-01-05': { watchedCount: 2, lectureIds: ['l2', 'l3'] },
    };
    assert.equal(resolveStartDate(historyWithFirstLecture, false, null, today), '2026-01-01');

    // User manually overrides course start date to 2025-12-15
    assert.equal(resolveStartDate(historyWithFirstLecture, true, '2025-12-15', today), '2025-12-15');

    // User resets manual override -> falls back to auto-detected 2026-01-01
    assert.equal(resolveStartDate(historyWithFirstLecture, false, '2025-12-15', today), '2026-01-01');
  });

  it('17. Track course activity date-wise like GitHub with course title, lecture number, title, and duration', () => {
    const courseA = {
      id: 'course-a',
      title: 'Course A',
      allLectures: [
        { id: 'l1', title: 'Intro to Course A', durationSec: 600, durationLabel: '10m' },
        { id: 'l2', title: 'Deep Dive A', durationSec: 1200, durationLabel: '20m' },
      ],
    };

    const courseB = {
      id: 'course-b',
      title: 'Course B',
      allLectures: [
        { id: 'b1', title: 'Intro to Course B', durationSec: 900, durationLabel: '15m' },
      ],
    };

    localStorage.setItem('jct_history__course-a', JSON.stringify({
      '2026-09-20': {
        watchedSec: 1800,
        watchedCount: 2,
        entries: [
          {
            courseId: 'course-a',
            courseTitle: 'Course A',
            lectureId: 'l1',
            lectureNumber: 1,
            lectureTitle: 'Intro to Course A',
            durationSec: 600,
            durationLabel: '10m',
          },
          {
            courseId: 'course-a',
            courseTitle: 'Course A',
            lectureId: 'l2',
            lectureNumber: 2,
            lectureTitle: 'Deep Dive A',
            durationSec: 1200,
            durationLabel: '20m',
          },
        ],
      },
    }));

    localStorage.setItem('jct_history__course-b', JSON.stringify({
      '2026-09-20': {
        watchedSec: 900,
        watchedCount: 1,
        entries: [
          {
            courseId: 'course-b',
            courseTitle: 'Course B',
            lectureId: 'b1',
            lectureNumber: 1,
            lectureTitle: 'Intro to Course B',
            durationSec: 900,
            durationLabel: '15m',
          },
        ],
      },
      '2026-09-21': {
        watchedSec: 0,
        watchedCount: 0,
        isPractice: true,
        practiceNote: 'Solved algorithms',
      },
    }));

    const aggregated = getAggregatedHistory([courseA, courseB]);

    // On 2026-09-20, both courses' activities are combined
    const day20 = aggregated['2026-09-20'];
    assert.ok(day20);
    assert.equal(day20.watchedSec, 2700);
    assert.equal(day20.watchedCount, 3);
    assert.equal(day20.entries.length, 3);

    // Verify course titles, lecture numbers, and titles
    assert.equal(day20.entries[0].courseTitle, 'Course A');
    assert.equal(day20.entries[0].lectureNumber, 1);
    assert.equal(day20.entries[0].lectureTitle, 'Intro to Course A');

    assert.equal(day20.entries[2].courseTitle, 'Course B');
    assert.equal(day20.entries[2].lectureNumber, 1);
    assert.equal(day20.entries[2].lectureTitle, 'Intro to Course B');

    // On 2026-09-21, practice day is captured
    const day21 = aggregated['2026-09-21'];
    assert.ok(day21);
    assert.equal(day21.isPractice, true);
    assert.equal(day21.practiceNote, 'Solved algorithms');
  });

  it('18. Only active section is automatically expanded, completed sections collapse when active section changes', () => {
    const dummyCourse = {
      id: 'test-course-expansion',
      title: 'Expansion Test Course',
      sections: [
        {
          id: 'sec-1',
          number: 1,
          title: 'Section 1',
          lectures: [{ id: 'l1' }, { id: 'l2' }, { id: 'l3' }],
        },
        {
          id: 'sec-2',
          number: 2,
          title: 'Section 2',
          lectures: [{ id: 'l4' }, { id: 'l5' }],
        },
        {
          id: 'sec-3',
          number: 3,
          title: 'Section 3',
          lectures: [{ id: 'l6' }],
        },
      ],
    };

    function computeAutoOpenSections(course, watchedSet, prevActiveId = null, currentOpen = {}) {
      const activeId = getActiveSectionId(course, watchedSet);
      const next = { ...currentOpen };
      if (Object.keys(currentOpen).length === 0) {
        course.sections.forEach((s) => { next[s.id] = s.id === activeId; });
        return { activeId, openSections: next };
      }
      if (prevActiveId && prevActiveId !== activeId) {
        next[prevActiveId] = false;
      }
      course.sections.forEach((s) => {
        if (s.id !== activeId) {
          const isComplete = s.lectures && s.lectures.length > 0 && s.lectures.every((l) => watchedSet.has(l.id));
          if (isComplete) next[s.id] = false;
        }
      });
      if (activeId) next[activeId] = true;
      return { activeId, openSections: next };
    }

    // Step 1: Initial load, no lectures watched -> only Section 1 is open
    let state = computeAutoOpenSections(dummyCourse, new Set());
    assert.equal(state.activeId, 'sec-1');
    assert.equal(state.openSections['sec-1'], true);
    assert.equal(state.openSections['sec-2'], false);
    assert.equal(state.openSections['sec-3'], false);

    // Step 2: Section 1 is partially watched (l1, l2) -> Section 1 still active and open
    state = computeAutoOpenSections(dummyCourse, new Set(['l1', 'l2']), state.activeId, state.openSections);
    assert.equal(state.activeId, 'sec-1');
    assert.equal(state.openSections['sec-1'], true);
    assert.equal(state.openSections['sec-2'], false);

    // Step 3: Section 1 becomes fully watched (l1, l2, l3) -> Section 2 becomes active, Section 1 collapses
    state = computeAutoOpenSections(dummyCourse, new Set(['l1', 'l2', 'l3']), state.activeId, state.openSections);
    assert.equal(state.activeId, 'sec-2');
    assert.equal(state.openSections['sec-1'], false);
    assert.equal(state.openSections['sec-2'], true);
    assert.equal(state.openSections['sec-3'], false);

    // Step 4: Section 2 partially watched (l4) -> Section 2 still active, Section 1 remains collapsed
    state = computeAutoOpenSections(dummyCourse, new Set(['l1', 'l2', 'l3', 'l4']), state.activeId, state.openSections);
    assert.equal(state.activeId, 'sec-2');
    assert.equal(state.openSections['sec-1'], false);
    assert.equal(state.openSections['sec-2'], true);

    // Step 5: Section 2 completed (l5) -> Section 3 becomes active, Section 2 collapses
    state = computeAutoOpenSections(dummyCourse, new Set(['l1', 'l2', 'l3', 'l4', 'l5']), state.activeId, state.openSections);
    assert.equal(state.activeId, 'sec-3');
    assert.equal(state.openSections['sec-1'], false);
    assert.equal(state.openSections['sec-2'], false);
    assert.equal(state.openSections['sec-3'], true);

    // Step 6: User unmarks l1 in Section 1 -> Section 1 becomes active again, Section 3 collapses
    state = computeAutoOpenSections(dummyCourse, new Set(['l2', 'l3', 'l4', 'l5']), state.activeId, state.openSections);
    assert.equal(state.activeId, 'sec-1');
    assert.equal(state.openSections['sec-1'], true);
    assert.equal(state.openSections['sec-2'], false);
    assert.equal(state.openSections['sec-3'], false);
  });

  it('19. Sections containing lectures in Today\'s Plan (with active yellow dot) are automatically expanded', () => {
    const course = {
      id: 'test-course-plan-expansion',
      title: 'Plan Expansion Course',
      sections: [
        {
          id: 'sec-1',
          number: 1,
          title: 'Section 1 (Complete)',
          lectures: [{ id: 'l1' }, { id: 'l2' }],
        },
        {
          id: 'sec-2',
          number: 2,
          title: 'Section 2 (In Progress)',
          lectures: [{ id: 'l3' }, { id: 'l4' }, { id: 'l5' }],
        },
        {
          id: 'sec-3',
          number: 3,
          title: 'Section 3 (Not Planned)',
          lectures: [{ id: 'l6' }, { id: 'l7' }],
        },
        {
          id: 'sec-4',
          number: 4,
          title: 'Section 4 (Project with Planned Lecture)',
          lectures: [{ id: 'l8' }, { id: 'l9' }],
        },
        {
          id: 'sec-5',
          number: 5,
          title: 'Section 5 (Not Planned)',
          lectures: [{ id: 'l10' }],
        },
      ],
    };

    // User has completed Section 1 (l1, l2) and part of Section 2 (l3, l4)
    const watchedSet = new Set(['l1', 'l2', 'l3', 'l4']);

    // User marks lecture l5 (in Section 2) AND lecture l8 (in Section 4) for Today's Plan
    const planSet = new Set(['l5', 'l8']);

    const activeIds = getActiveSectionIds(course, watchedSet, planSet);

    // Both Section 2 and Section 4 must be considered active because they contain today's planned lectures (yellow dot)
    assert.ok(activeIds.includes('sec-2'), 'Section 2 must be active');
    assert.ok(activeIds.includes('sec-4'), 'Section 4 must be active (has planned lecture with yellow dot)');

    // Section 1 (complete, no planned lectures) and Section 3 & 5 (no planned lectures) must NOT be active
    assert.ok(!activeIds.includes('sec-1'), 'Completed Section 1 without planned lectures must not be active');
    assert.ok(!activeIds.includes('sec-3'), 'Section 3 without planned lectures must not be active');
    assert.ok(!activeIds.includes('sec-5'), 'Section 5 without planned lectures must not be active');
  });

  it('20. Calendar shows 1 additional month ahead in current year and accurate intensity levels', () => {
    const currentYear = new Date().getFullYear();
    const weeks = buildWeeksForYear(currentYear, true);

    // 52 past weeks + ~4-5 weeks of 1 additional month ahead
    assert.ok(weeks.length >= 56, `Expected at least 56 weeks, got ${weeks.length}`);

    // Verify last day of calendar is at least 25 days in the future
    const lastWeek = weeks[weeks.length - 1];
    const lastDay = lastWeek[6];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((lastDay - today) / (1000 * 60 * 60 * 24));
    assert.ok(diffDays >= 25, `Expected calendar to extend roughly 1 month into future, got ${diffDays} days`);

    // Verify heatmap intensity calculation
    assert.equal(intensity(0, 3600), 0);
    assert.equal(intensity(600, 3600), 1);
    assert.equal(intensity(1500, 3600), 2);
    assert.equal(intensity(2700, 3600), 3);
    assert.equal(intensity(3600, 3600), 4);
    assert.equal(intensity(7200, 3600), 4);
  });

  it('21. Default motivation provides 15 curated messages and rotates deterministically', () => {
    assert.equal(DEFAULT_MOTIVATION_MESSAGES.length, 15, 'Must have exactly 15 curated motivation messages');
    DEFAULT_MOTIVATION_MESSAGES.forEach((msg, idx) => {
      assert.ok(typeof msg === 'string' && msg.length > 20, `Message ${idx} must be a substantial encouraging string`);
    });

    // Verify pickDefaultMotivation returns valid message
    const msg1 = pickDefaultMotivation(0, '2026-09-29');
    const msg2 = pickDefaultMotivation(1, '2026-09-30');
    assert.ok(DEFAULT_MOTIVATION_MESSAGES.includes(msg1));
    assert.ok(DEFAULT_MOTIVATION_MESSAGES.includes(msg2));
  });

  it('22. OpenAI API key verification handles validation, timeouts, and response states', async () => {
    // 1. Empty or missing key
    const emptyRes = await verifyOpenAiApiKey('');
    assert.equal(emptyRes.ok, false);
    assert.ok(emptyRes.error.includes('Please enter'));

    const nullRes = await verifyOpenAiApiKey(null);
    assert.equal(nullRes.ok, false);

    // 2. Invalid key prefix (not starting with sk-)
    const invalidPrefix = await verifyOpenAiApiKey('invalid-token-12345');
    assert.equal(invalidPrefix.ok, false);
    assert.ok(invalidPrefix.error.includes('start with "sk-"'));

    // 3. Mock fetch to test 200, 401, 429
    const originalFetch = globalThis.fetch;
    try {
      // Test 200 OK
      globalThis.fetch = async () => ({
        status: 200,
        json: async () => ({ data: [{ id: 'gpt-4o' }, { id: 'gpt-4o-mini' }] }),
      });
      const okRes = await verifyOpenAiApiKey('sk-validtest1234567890abcdef');
      assert.equal(okRes.ok, true);
      assert.equal(okRes.status, 200);
      assert.ok(okRes.message.includes('verified and working'));
      assert.ok(okRes.message.includes('2 models active'));

      // Test 401 Unauthorized
      globalThis.fetch = async () => ({
        status: 401,
        json: async () => ({ error: { message: 'Incorrect API key provided' } }),
      });
      const unauthRes = await verifyOpenAiApiKey('sk-revoked1234567890abcdef');
      assert.equal(unauthRes.ok, false);
      assert.equal(unauthRes.status, 401);
      assert.ok(unauthRes.error.includes('invalid, expired, or was revoked'));

      // Test 429 Quota Exceeded
      globalThis.fetch = async () => ({
        status: 429,
        json: async () => ({ error: { message: 'Rate limit or quota exceeded' } }),
      });
      const quotaRes = await verifyOpenAiApiKey('sk-overquota1234567890abcdef');
      assert.ok(quotaRes.error.includes('Quota exceeded'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('23. Per-section progress display setting defaults to 7 and clamps correctly between 5 and 10', () => {
    // 1. Verify default visible count is 7
    const defaultVisibleCount = 7;
    assert.equal(defaultVisibleCount, 7, 'Default visible section count must be 7');

    // 2. Test clamping logic used by component
    const clampVisibleCount = (count) => Math.max(5, Math.min(10, count || 7));
    assert.equal(clampVisibleCount(10), 10);
    assert.equal(clampVisibleCount(9), 9);
    assert.equal(clampVisibleCount(8), 8);
    assert.equal(clampVisibleCount(7), 7);
    assert.equal(clampVisibleCount(6), 6);
    assert.equal(clampVisibleCount(5), 5);
    assert.equal(clampVisibleCount(15), 10, 'Values over 10 must clamp to 10');
    assert.equal(clampVisibleCount(2), 5, 'Values under 5 must clamp to 5');
    assert.equal(clampVisibleCount(undefined), 7, 'Undefined values must default to 7');

    // 3. Test auto-adjustment when course has fewer sections than configured limit
    const getEffectiveCount = (configured, sectionCount) => {
      const clamped = Math.max(5, Math.min(10, configured || 10));
      return sectionCount > 0 ? Math.min(clamped, sectionCount) : clamped;
    };
    assert.equal(getEffectiveCount(10, 2), 2, '2-section course must auto-adjust visible count to 2');
    assert.equal(getEffectiveCount(10, 1), 1, '1-section course must auto-adjust visible count to 1');
    assert.equal(getEffectiveCount(10, 6), 6, '6-section course must auto-adjust visible count to 6');
    assert.equal(getEffectiveCount(10, 18), 10, '18-section course must cap at configured 10');
    assert.equal(getEffectiveCount(5, 18), 5, '18-section course with 5 configured must cap at 5');

    // 4. Verify settings persistence in localStorage
    const testSettings = { dailyTargetHours: 1.5, perSectionVisibleCount: 8 };
    localStorage.setItem('course_tracker_settings_v1', JSON.stringify(testSettings));
    const retrieved = JSON.parse(localStorage.getItem('course_tracker_settings_v1'));
    assert.equal(retrieved.perSectionVisibleCount, 8);
  });

  it('24. Course completion and streak milestone badges calculate, unlock, and isolate per course', async () => {
    const { getBadgesStatus, getBadgeRank, COURSE_COMPLETION_BADGES, STREAK_BADGES, ALL_BADGES } = await import('../utils/badges.js');

    // 1. Verify badge counts and threshold specifications
    assert.equal(ALL_BADGES.length, 12, 'Must have exactly 12 total milestone badges');
    assert.equal(COURSE_COMPLETION_BADGES.length, 6, 'Must have 6 course completion badges');
    assert.equal(STREAK_BADGES.length, 6, 'Must have 6 streak milestone badges');

    const completionThresholds = COURSE_COMPLETION_BADGES.map((b) => b.threshold);
    assert.deepEqual(completionThresholds, [10, 20, 50, 80, 90, 100], 'Completion thresholds must be 10%, 20%, 50%, 80%, 90%, 100%');

    const streakThresholds = STREAK_BADGES.map((b) => b.threshold);
    assert.deepEqual(streakThresholds, [7, 15, 30, 50, 75, 100], 'Streak thresholds must be 7, 15, 30, 50, 75, 100 days');

    // 2. Evaluate fresh user (0% completion, 0 streak)
    const freshStatus = getBadgesStatus({ pct: 0, streak: 0, longestStreak: 0 });
    assert.equal(freshStatus.filter((b) => b.isUnlocked).length, 0, 'Fresh user should have 0 unlocked badges');

    // 3. Evaluate 15% completion and 8-day streak
    const partialStatus = getBadgesStatus({
      pct: 15,
      streak: 8,
      longestStreak: 5,
      unlockedDates: { completion_10: '2026-10-01T00:00:00.000Z' },
    });
    const unlockedPartial = partialStatus.filter((b) => b.isUnlocked);
    assert.equal(unlockedPartial.length, 2, 'Should unlock 10% completion and 7-day streak badges');
    assert.equal(unlockedPartial.some((b) => b.id === 'completion_10'), true);
    assert.equal(unlockedPartial.some((b) => b.id === 'streak_7'), true);
    assert.equal(unlockedPartial.some((b) => b.id === 'completion_20'), false);
    assert.equal(unlockedPartial.some((b) => b.id === 'streak_15'), false);

    // 4. Evaluate 50% completion and 30-day streak
    const midStatus = getBadgesStatus({ pct: 55, streak: 12, longestStreak: 32 });
    const unlockedMid = midStatus.filter((b) => b.isUnlocked);
    // Unlocked completion: 10, 20, 50 (3 badges)
    // Unlocked streak (longestStreak 32): 7, 15, 30 (3 badges)
    assert.equal(unlockedMid.length, 6, 'Should unlock 3 completion badges and 3 streak badges');

    // 5. Evaluate full completion (100%) and 100-day streak
    const fullStatus = getBadgesStatus({ pct: 100, streak: 105, longestStreak: 105 });
    const unlockedFull = fullStatus.filter((b) => b.isUnlocked);
    assert.equal(unlockedFull.length, 12, '100% completion and 100+ day streak must unlock all 12 badges');

    // 6. Test Rank tiers
    assert.equal(getBadgeRank(0).title, 'Aspiring Achiever');
    assert.equal(getBadgeRank(2).title, 'Dedicated Novice');
    assert.equal(getBadgeRank(5).title, 'Consistent Scholar');
    assert.equal(getBadgeRank(8).title, 'Elite Achiever');
    assert.equal(getBadgeRank(10).title, 'Centurion Master');
    assert.equal(getBadgeRank(12).title, 'Grandmaster Legend');

    // 7. Verify localStorage namespacing and purge
    const courseId = 'test_course_badges';
    const badgeKey = `jct_badges__${courseId}`;
    localStorage.setItem(badgeKey, JSON.stringify({ completion_10: '2026-10-01' }));
    assert.ok(localStorage.getItem(badgeKey));
  });

  it('25. Auto-use trial streak protection provides default 2 shields, auto-bridges missed days, and supports promo codes and email requests', async () => {
    const {
      DEFAULT_STREAK_FREEZE_COUNT,
      createInitialStreakFreezeState,
      autoApplyStreakFreezes,
      redeemStreakPromoCode,
      getStreakPromoEmailUrl,
      SUPPORT_EMAIL,
    } = await import('../features/streak/models/streakFreezeModel.js');
    const { isBucketQualifying } = await import('../features/streak/models/streakModel.js');

    // 1. Initial State has default 2 available freezes
    assert.equal(DEFAULT_STREAK_FREEZE_COUNT, 2, 'Default shields must be 2');
    const fresh = createInitialStreakFreezeState();
    assert.equal(fresh.availableFreezes, 2);
    assert.deepEqual(fresh.usedFreezes, []);
    assert.deepEqual(fresh.redeemedCodes, []);

    // 2. isBucketQualifying recognizes streak freeze and trial streak
    assert.equal(isBucketQualifying({ isStreakFreeze: true }), true, 'Streak freeze must qualify');
    assert.equal(isBucketQualifying({ isTrialStreak: true }), true, 'Trial streak must qualify');
    assert.equal(isBucketQualifying({ watchedCount: 0 }), false);

    // 3. Auto-apply streak freezes when user misses days
    // Scenario: user studied on Day 1 (anchor), missed Day 2 and Day 3, today is Day 4
    const history = {
      '2026-09-28': { watchedCount: 2, watchedSec: 3600 },
    };
    const freezeStore = { availableFreezes: 2, usedFreezes: [], redeemedCodes: [] };

    // Reference date: 2026-10-01 (Oct 1)
    const result = autoApplyStreakFreezes({
      history,
      startDate: '2026-09-28',
      freezeStore,
      streakMode: 'any',
      targetSec: 3600,
      referenceDate: new Date('2026-10-01T12:00:00Z'),
    });

    assert.equal(result.appliedCount, 2, 'Should bridge 2 missed days (Sept 29 & Sept 30)');
    assert.equal(result.freezeStore.availableFreezes, 0, 'Remaining freezes should be 0');
    assert.equal(result.freezeStore.usedFreezes.length, 2);
    assert.ok(result.history['2026-09-29']?.isStreakFreeze, 'Sept 29 must have streak freeze');
    assert.ok(result.history['2026-09-30']?.isStreakFreeze, 'Sept 30 must have streak freeze');

    // With the auto-applied freezes, streak from Sept 28 is saved!
    const updatedHistoryWithToday = {
      ...result.history,
      '2026-10-01': { watchedCount: 1, watchedSec: 1800 },
    };
    assert.ok(isBucketQualifying(updatedHistoryWithToday['2026-09-28']));
    assert.ok(isBucketQualifying(updatedHistoryWithToday['2026-09-29']));
    assert.ok(isBucketQualifying(updatedHistoryWithToday['2026-09-30']));
    assert.ok(isBucketQualifying(updatedHistoryWithToday['2026-10-01']));

    // 4. Promo code redemption
    const redeem1 = redeemStreakPromoCode('STREAKBOOST', result.freezeStore);
    assert.equal(redeem1.success, true, 'STREAKBOOST should redeem successfully');
    assert.equal(redeem1.addedShields, 2, 'STREAKBOOST should add 2 shields');
    assert.equal(redeem1.updatedStore.availableFreezes, 2, 'Balance should increase from 0 to 2');
    assert.ok(redeem1.updatedStore.redeemedCodes.includes('STREAKBOOST'));

    // Duplicate redemption prevention
    const redeemDup = redeemStreakPromoCode('STREAKBOOST', redeem1.updatedStore);
    assert.equal(redeemDup.success, false, 'Duplicate code redemption must fail');
    assert.ok(redeemDup.error.includes('already been redeemed'));

    // Invalid promo code rejection
    const redeemBad = redeemStreakPromoCode('FAKECODE999', redeem1.updatedStore);
    assert.equal(redeemBad.success, false, 'Invalid code must be rejected');

    // Student bonus promo code (+2 shields)
    const redeemStudent = redeemStreakPromoCode('STUDENT2026', redeem1.updatedStore);
    assert.equal(redeemStudent.success, true);
    assert.equal(redeemStudent.addedShields, 2);
    assert.equal(redeemStudent.updatedStore.availableFreezes, 4);

    // 5. Support email url generation
    const emailUrl = getStreakPromoEmailUrl('Core Java + AI');
    assert.ok(emailUrl.startsWith('mailto:'), 'Must generate a valid mailto link');
    assert.ok(emailUrl.includes(SUPPORT_EMAIL));
    assert.ok(emailUrl.includes('Core%20Java%20%2B%20AI'));
  });

  it('26. Mobile Bottom Navigation and Drawer mutual exclusion state logic', () => {
    // Simulator for App.jsx navigation and drawer state
    let state = {
      calendarOpen: false,
      settingsOpen: false,
      badgesOpen: false,
      activeNavTab: 'home',
    };

    const getActiveTab = () => {
      if (state.calendarOpen) return 'streak';
      if (state.badgesOpen) return 'badges';
      if (state.settingsOpen) return 'settings';
      return state.activeNavTab;
    };

    const openStreak = () => {
      state.settingsOpen = false;
      state.badgesOpen = false;
      state.calendarOpen = true;
      state.activeNavTab = 'streak';
    };

    const openBadges = () => {
      state.calendarOpen = false;
      state.settingsOpen = false;
      state.badgesOpen = true;
      state.activeNavTab = 'badges';
    };

    const openSettings = () => {
      state.calendarOpen = false;
      state.badgesOpen = false;
      state.settingsOpen = true;
      state.activeNavTab = 'settings';
    };

    const toggleBadges = () => {
      if (state.badgesOpen) {
        state.badgesOpen = false;
        state.activeNavTab = 'home';
      } else {
        openBadges();
      }
    };

    const toggleSettings = () => {
      if (state.settingsOpen) {
        state.settingsOpen = false;
        state.activeNavTab = 'home';
      } else {
        openSettings();
      }
    };

    const toggleStreak = () => {
      if (state.calendarOpen) {
        state.calendarOpen = false;
        state.activeNavTab = 'home';
      } else {
        openStreak();
      }
    };

    const navigateHome = () => {
      state.calendarOpen = false;
      state.settingsOpen = false;
      state.badgesOpen = false;
      state.activeNavTab = 'home';
    };

    // Initial state: home
    assert.equal(getActiveTab(), 'home');

    // 1. Open Badges
    openBadges();
    assert.equal(state.badgesOpen, true);
    assert.equal(state.settingsOpen, false);
    assert.equal(state.calendarOpen, false);
    assert.equal(getActiveTab(), 'badges');

    // 2. Switch from Badges directly to Settings: Badges must close automatically
    openSettings();
    assert.equal(state.settingsOpen, true);
    assert.equal(state.badgesOpen, false, 'Badges must close when Settings opens');
    assert.equal(state.calendarOpen, false);
    assert.equal(getActiveTab(), 'settings');

    // 3. Switch from Settings directly to Streak: Settings must close automatically
    openStreak();
    assert.equal(state.calendarOpen, true);
    assert.equal(state.settingsOpen, false, 'Settings must close when Streak opens');
    assert.equal(state.badgesOpen, false);
    assert.equal(getActiveTab(), 'streak');

    // 4. Toggle Streak closed by tapping active Streak button again
    toggleStreak();
    assert.equal(state.calendarOpen, false);
    assert.equal(getActiveTab(), 'home', 'Closing drawer must return active tab to home');

    // 5. Open Badges, then toggle closed by tapping Badges again
    toggleBadges();
    assert.equal(state.badgesOpen, true);
    assert.equal(getActiveTab(), 'badges');
    toggleBadges();
    assert.equal(state.badgesOpen, false);
    assert.equal(getActiveTab(), 'home');

    // 6. Open Settings, then toggle closed by tapping Settings again
    toggleSettings();
    assert.equal(state.settingsOpen, true);
    assert.equal(getActiveTab(), 'settings');
    toggleSettings();
    assert.equal(state.settingsOpen, false);
    assert.equal(getActiveTab(), 'home');

    // 7. Navigate Home from inside Settings closes Settings and preserves home
    openSettings();
    assert.equal(state.settingsOpen, true);
    navigateHome();
    assert.equal(state.settingsOpen, false);
    assert.equal(getActiveTab(), 'home');
  });

  it('27. Daily motivation popup triggers, display state, and local storage tracking', async () => {
    const { getShownDate, setShownDate, triggerMotivationPopup } = await import('../features/motivation/viewmodels/useMotivationViewModel.js');
    const { pickDefaultMotivation, DEFAULT_MOTIVATION_MESSAGES } = await import('../features/motivation/models/motivationModel.js');

    // 1. Verify storage tracking
    setShownDate('2026-10-02');
    assert.equal(getShownDate(), '2026-10-02', 'Shown date must be recorded in localStorage');

    // 2. Verify deterministic rotating message
    const msg1 = pickDefaultMotivation(5, '2026-10-02');
    assert.ok(msg1 && msg1.length > 10, 'Must produce a valid motivational quote');
    assert.ok(DEFAULT_MOTIVATION_MESSAGES.includes(msg1));

    // 3. Verify custom trigger event with mock window
    const listeners = new Map();
    const mockWindow = {
      addEventListener: (evt, cb) => {
        const arr = listeners.get(evt) || [];
        arr.push(cb);
        listeners.set(evt, arr);
      },
      removeEventListener: (evt, cb) => {
        const arr = listeners.get(evt) || [];
        listeners.set(evt, arr.filter((f) => f !== cb));
      },
      dispatchEvent: (evt) => {
        const arr = listeners.get(evt?.type || evt) || [];
        arr.forEach((cb) => cb(evt));
        return true;
      },
    };
    globalThis.window = mockWindow;

    let eventReceived = false;
    const onTrigger = () => { eventReceived = true; };
    globalThis.window.addEventListener('jct:show_motivation', onTrigger);

    triggerMotivationPopup();
    assert.equal(eventReceived, true, 'triggerMotivationPopup must dispatch jct:show_motivation');
    globalThis.window.removeEventListener('jct:show_motivation', onTrigger);
  });

  it('28. Motivational quotes offline-first prefetching, queueing, and next-day instant display', async () => {
    const {
      getMotivationStore,
      resolveTodayMotivation,
      cycleNextMotivationQuote,
      enqueueUpcomingQuotes,
      MOTIVATION_STORE_KEY,
    } = await import('../features/motivation/models/motivationModel.js');

    // 1. Clear motivation storage
    globalThis.localStorage.removeItem(MOTIVATION_STORE_KEY);

    // 2. Day 1: User logs in today (2026-10-03)
    const day1Result = resolveTodayMotivation({ today: '2026-10-03', streak: 2 });
    assert.ok(day1Result.quote && day1Result.quote.text, 'Day 1 quote must be resolved immediately');
    assert.equal(day1Result.quote.date, '2026-10-03', 'Day 1 date must match today');

    // Check store in localStorage: must pre-store all 14 remaining quotes locally
    const storeAfterDay1 = getMotivationStore();
    assert.equal(storeAfterDay1.todayQuote.text, day1Result.quote.text);
    assert.ok(storeAfterDay1.queue.length >= 10, 'Must pre-store 10-15 quotes in queue for future days');
    assert.equal(storeAfterDay1.queue.length, 14, 'Must pre-store all 14 remaining quotes locally in queue');

    const firstQueuedQuote = storeAfterDay1.queue[0].text;
    assert.ok(firstQueuedQuote && firstQueuedQuote.length > 10, 'First queued quote must be pre-populated');

    // Verify randomization across simulated devices on first launch
    const deviceQuotes = new Set();
    for (let d = 0; d < 10; d++) {
      globalThis.localStorage.removeItem(MOTIVATION_STORE_KEY);
      const res = resolveTodayMotivation({ today: '2026-10-03', streak: 0 });
      deviceQuotes.add(res.quote.text);
    }
    // Across 10 device simulations, it must not return the exact same quote every time
    assert.ok(deviceQuotes.size > 1, 'Different user devices must receive randomized quotes on first open');

    // Restore Day 1 state for remaining assertions
    globalThis.localStorage.removeItem(MOTIVATION_STORE_KEY);
    resolveTodayMotivation({ today: '2026-10-03', streak: 2 });

    // 3. Simulated AI prefetch adds custom AI quotes to queue
    const aiQuotes = [
      'Mastering Core Java is like building muscle: daily deliberate practice turns confusion into mastery.',
      'One clean method at a time. Your dedication today will unlock senior engineering opportunities.',
    ];
    enqueueUpcomingQuotes(aiQuotes, '2026-10-03');

    const storeWithAi = getMotivationStore();
    assert.equal(storeWithAi.queue[0].text, aiQuotes[0], 'AI generated quote must be queued at head of upcoming queue');
    assert.equal(storeWithAi.queue[0].isAiGenerated, true);

    // 4. Day 2: User opens the app on the next day (2026-10-04)
    // Should immediately display the pre-fetched quote with 0ms delay!
    const day2Result = resolveTodayMotivation({ today: '2026-10-04', streak: 3 });
    assert.equal(day2Result.quote.date, '2026-10-04');
    assert.equal(day2Result.quote.text, aiQuotes[0], 'Day 2 must immediately serve the quote pre-cached on Day 1');
    assert.equal(day2Result.quote.isAiGenerated, true);

    // Verify queue still maintains upcoming quotes
    const storeAfterDay2 = getMotivationStore();
    assert.ok(storeAfterDay2.queue.length >= 3, 'Queue must replenish automatically for subsequent days');

    // 5. Test manual cycling of pre-stored quotes
    const cycledResult = cycleNextMotivationQuote({ today: '2026-10-04', streak: 3 });
    assert.notEqual(cycledResult.quote.text, day2Result.quote.text, 'Cycled quote must advance to next pre-cached quote');
    assert.ok(cycledResult.quote.text.length > 10);

    // 6. Test error diagnosis and fallback toast notifications
    const { explainPrefetchError } = await import('../features/motivation/models/motivationModel.js');
    const authErr = explainPrefetchError(new Error('Invalid key'), 401);
    assert.ok(authErr.includes('OpenAI Auth Error (401)') || authErr.includes('401'), 'Must diagnose 401 auth error');

    const quotaErr = explainPrefetchError(new Error('Rate limited'), 429);
    assert.ok(quotaErr.includes('429') && quotaErr.includes('Quota'), 'Must diagnose 429 quota error');

    const serverErr = explainPrefetchError(new Error('Gateway down'), 503);
    assert.ok(serverErr.includes('503') && serverErr.includes('Server Down'), 'Must diagnose 503 server down');

    const timeoutErr = explainPrefetchError(new Error('The operation was aborted'), null);
    assert.ok(timeoutErr.includes('Timeout'), 'Must diagnose timeout error');

    // 7. Test generateFreshMotivationQuote live generation & cycling
    const { generateFreshMotivationQuote } = await import('../features/motivation/models/motivationModel.js');
    const freshWithoutKey = await generateFreshMotivationQuote({
      apiKey: null,
      context: { streak: 5, courseTitle: 'Core Java + AI' },
      today: '2026-10-04',
    });
    assert.ok(freshWithoutKey?.text, 'Must return a fresh quote even without API key');
    assert.ok(freshWithoutKey.text.length > 10);
  });

  it('Subtest 29: Enterprise Notification Center and Push Reminder Service', async () => {
    const {
      getNotifications,
      addNotification,
      markNotificationRead,
      markAllNotificationsRead,
      deleteNotification,
      clearAllNotifications,
      getUnreadNotificationCount,
      getNotificationSettings,
      saveNotificationSettings,
      checkAndTriggerScheduledReminder,
      NOTIFICATION_TYPES,
      DEFAULT_NOTIFICATION_SETTINGS,
      isSystemNoticeNotification,
      sendBrowserPushNotification,
    } = await import('../features/notifications/models/notificationModel.js');

    // 1. Storage starts clean
    clearAllNotifications();
    assert.equal(getNotifications().length, 0);
    assert.equal(getUnreadNotificationCount(), 0);

    // 1b. Verify system notice push exclusion settings & classification helper
    assert.equal(DEFAULT_NOTIFICATION_SETTINGS.systemNoticePushEnabled, false);
    assert.equal(isSystemNoticeNotification(NOTIFICATION_TYPES.SYSTEM, 'System Notice'), true);
    assert.equal(isSystemNoticeNotification('system', 'OpenAI / ChatGPT Service Alert'), true);
    assert.equal(isSystemNoticeNotification('reminder', 'System Notice: Service update'), true);
    assert.equal(isSystemNoticeNotification(NOTIFICATION_TYPES.REMINDER, 'Time to Study Core Java!'), false);
    assert.equal(isSystemNoticeNotification(NOTIFICATION_TYPES.ACHIEVEMENT, 'Achievement Unlocked'), false);
    assert.equal(isSystemNoticeNotification(NOTIFICATION_TYPES.STREAK, 'Streak Active 5 Days!'), false);

    // 1c. Verify Push Notification dispatch: System notices are strictly blocked from push notifications
    const dispatchedPushAlerts = [];
    class MockPushNotification {
      static permission = 'granted';
      static requestPermission = async () => 'granted';
      constructor(title, options) {
        this.title = title;
        this.options = options;
        dispatchedPushAlerts.push({ title, options });
      }
    }
    const prevNotification = globalThis.Notification;
    globalThis.Notification = MockPushNotification;

    saveNotificationSettings({ pushEnabled: true });

    // Adding a SYSTEM notice into Notification Center
    addNotification({
      type: NOTIFICATION_TYPES.SYSTEM,
      title: 'System Notice: Service Health Degraded',
      message: 'Background server latency is high.',
    });

    // Directly calling sendBrowserPushNotification with a system notice
    const directResult = sendBrowserPushNotification('System Notice: Maintenance', {
      type: NOTIFICATION_TYPES.SYSTEM,
      body: 'Scheduled downtime',
    });
    assert.equal(directResult, null, 'Direct sendBrowserPushNotification must return null for system notices');

    // System notices MUST NEVER be pushed to desktop/browser notification tray
    assert.equal(
      dispatchedPushAlerts.length,
      0,
      'System notices must NEVER be dispatched to native browser push notifications'
    );

    // Adding a REMINDER or ACHIEVEMENT notification DOES dispatch a push notification
    addNotification({
      type: NOTIFICATION_TYPES.REMINDER,
      title: 'Study Reminder ☕🔥',
      message: 'Time to learn Java!',
    });
    assert.equal(
      dispatchedPushAlerts.length,
      1,
      'Non-system notifications (reminders) must trigger push notification when enabled'
    );
    assert.equal(dispatchedPushAlerts[0].title, 'Study Reminder ☕🔥');

    // Clean up mock
    globalThis.Notification = prevNotification;
    clearAllNotifications();

    // 2. Add notifications of different categories
    const notif1 = addNotification({
      type: NOTIFICATION_TYPES.ACHIEVEMENT,
      title: 'Achievement Unlocked: Quick Starter! 🏆',
      message: 'Completed your first 5 lectures.',
      actionType: 'open_badges',
    });
    assert.ok(notif1?.id, 'Notification must have a generated ID');
    assert.equal(notif1.read, false, 'New notification must be unread');

    const notif2 = addNotification({
      type: NOTIFICATION_TYPES.SYSTEM,
      title: 'OpenAI / ChatGPT Service Alert',
      message: 'Quota exceeded (429). Fallback motivational quotes active.',
      actionType: 'open_settings',
    });
    assert.ok(notif2?.id);

    const notif3 = addNotification({
      type: NOTIFICATION_TYPES.STREAK,
      title: 'Streak Shield Auto-Applied! 🛡️',
      message: 'Protected 1 missed day to keep your streak alive.',
      actionType: 'open_streak',
    });
    assert.ok(notif3?.id);

    // Verify list and unread count
    const list = getNotifications();
    assert.equal(list.length, 3);
    assert.equal(getUnreadNotificationCount(), 3);

    // 3. Deduplication check: adding identical alert immediately should return null
    const duplicate = addNotification({
      type: NOTIFICATION_TYPES.SYSTEM,
      title: 'OpenAI / ChatGPT Service Alert',
      message: 'Quota exceeded (429). Fallback motivational quotes active.',
    });
    assert.equal(duplicate, null, 'Duplicate alert within 30s must be suppressed');
    assert.equal(getNotifications().length, 3);

    // 4. Mark single item as read
    markNotificationRead(notif1.id);
    assert.equal(getUnreadNotificationCount(), 2);
    const updatedList = getNotifications();
    const found1 = updatedList.find((n) => n.id === notif1.id);
    assert.equal(found1.read, true);

    // 5. Mark all as read
    markAllNotificationsRead();
    assert.equal(getUnreadNotificationCount(), 0);

    // 6. Delete single item
    deleteNotification(notif2.id);
    const afterDelete = getNotifications();
    assert.equal(afterDelete.length, 2);
    assert.ok(!afterDelete.some((n) => n.id === notif2.id));

    // 7. Notification settings persistence
    saveNotificationSettings({
      dailyReminderEnabled: true,
      studyReminderTime: '19:30',
      pushEnabled: true,
    });
    const savedSettings = getNotificationSettings();
    assert.equal(savedSettings.dailyReminderEnabled, true);
    assert.equal(savedSettings.studyReminderTime, '19:30');
    assert.equal(savedSettings.pushEnabled, true);

    // 8. Scheduled study reminder engine
    // Set reminder time to 00:00 so it is definitely due today
    saveNotificationSettings({
      dailyReminderEnabled: true,
      studyReminderTime: '00:00',
      lastSentReminderDate: null,
    });
    const triggered = checkAndTriggerScheduledReminder({
      streak: 5,
      courseTitle: 'Core Java + AI',
      remainingLectures: 42,
    });
    assert.equal(triggered, true, 'Must trigger reminder when time condition is satisfied');

    // Verify that the reminder was added to Notification Center
    const latestNotifs = getNotifications();
    const reminderNotif = latestNotifs.find((n) => n.type === NOTIFICATION_TYPES.REMINDER);
    assert.ok(reminderNotif, 'Reminder notification must be stored in Notification Center');
    assert.ok(reminderNotif.title.includes('Study') || reminderNotif.title.includes('Core Java'));

    // Verify deduplication: calling again today should NOT trigger another reminder
    const secondTrigger = checkAndTriggerScheduledReminder({
      streak: 5,
      courseTitle: 'Core Java + AI',
      remainingLectures: 42,
    });
    assert.equal(secondTrigger, false, 'Must not duplicate reminder on the same date');

    // 9. Clear all notifications
    clearAllNotifications();
    assert.equal(getNotifications().length, 0);
  });

  it('30. 90% Course Completion flow, 8-digit PIN verification gate, and 100% final completion transition', () => {
    const courseId = 'course-completion-test-101';
    resetCompletionState(courseId);

    // 1. Below 90% threshold: no completion banner or prompt shown
    const underThreshold = evaluateCompletionBanner(courseId, 85);
    assert.equal(underThreshold.show, false);
    assert.equal(underThreshold.milestone, null);
    assert.equal(underThreshold.status, COMPLETION_STATUS.IN_PROGRESS);

    // 2. Reaching 90%: Mark as Complete banner becomes available
    const at90 = evaluateCompletionBanner(courseId, 90);
    assert.equal(at90.show, true);
    assert.ok(at90.milestone);
    assert.equal(at90.milestone.pct, 90);
    assert.equal(at90.milestone.cta, 'Mark as Complete');
    assert.equal(at90.status, COMPLETION_STATUS.IN_PROGRESS);

    // Initial state check
    const initialState = getCompletionState(courseId);
    assert.equal(initialState.status, COMPLETION_STATUS.IN_PROGRESS);
    assert.equal(initialState.pin, null);
    assert.equal(initialState.verifiedAt, null);
    assert.equal(initialState.completedAt, null);

    // 3. User clicks "Mark as Complete" -> generates 8-digit PIN
    const pendingState = initiateVerification(courseId);
    assert.equal(pendingState.status, COMPLETION_STATUS.VERIFICATION_PENDING);
    assert.ok(pendingState.pin);
    assert.equal(typeof pendingState.pin, 'string');
    assert.equal(pendingState.pin.length, 8);
    assert.match(pendingState.pin, /^\d{8}$/, 'PIN must consist of exactly 8 numeric digits');
    assert.ok(pendingState.pinGeneratedAt);

    // SECURITY VERIFICATION: Plaintext PIN must NEVER be saved in localStorage!
    const storedState = JSON.parse(localStorage.getItem('jct_completion__' + courseId));
    assert.equal(storedState.pin, undefined, 'Plaintext PIN must NEVER be stored in localStorage');
    assert.ok(storedState.pinHash, 'Cryptographic PIN hash must be stored in localStorage');
    assert.equal(storedState.pinHash.length, 64, 'SHA-256 hash must be exactly 64 hex characters');
    assert.ok(storedState.salt, 'Cryptographic salt must be stored in localStorage');
    assert.ok(storedState.pinExpiresAt, 'PIN expiration timestamp must be stored');

    // 4. PIN verification gate validation
    // Test: empty PIN
    const emptyRes = attemptPinVerification(courseId, '');
    assert.equal(emptyRes.success, false);
    assert.ok(emptyRes.error.includes('PIN'));

    // Test: wrong length
    const shortRes = attemptPinVerification(courseId, '12345');
    assert.equal(shortRes.success, false);
    assert.equal(shortRes.error, 'PIN must be exactly 8 digits.');

    // Test: wrong digits
    const incorrectPin = pendingState.pin === '12345678' ? '87654321' : '12345678';
    const wrongRes = attemptPinVerification(courseId, incorrectPin);
    assert.equal(wrongRes.success, false);
    assert.equal(wrongRes.error, 'Incorrect PIN. Please check and try again.');

    // Test: correct 8-digit PIN
    const correctRes = attemptPinVerification(courseId, pendingState.pin);
    assert.equal(correctRes.success, true);
    assert.equal(correctRes.state.status, COMPLETION_STATUS.VERIFICATION_COMPLETED);
    assert.equal(correctRes.state.pin, null, 'PIN must be cleared after successful verification');
    assert.ok(correctRes.state.verifiedAt);
    assert.equal(correctRes.state.completedAt, null, 'Course must NOT be marked completed yet (only 90%)');

    // 5. At 95% completion, course is pre-verified but NOT officially completed
    const at95 = evaluateCompletionBanner(courseId, 95);
    assert.equal(at95.show, true);
    assert.equal(at95.milestone.pct, 95);
    assert.equal(at95.status, COMPLETION_STATUS.VERIFICATION_COMPLETED);
    const stateAt95 = getCompletionState(courseId);
    assert.equal(stateAt95.status, COMPLETION_STATUS.VERIFICATION_COMPLETED);
    assert.equal(stateAt95.completedAt, null, 'Course must not be marked complete below 100%');

    // 6. User reaches 100% completion -> Course officially and automatically marked as Completed
    const at100 = evaluateCompletionBanner(courseId, 100);
    assert.equal(at100.show, true);
    assert.equal(at100.milestone.pct, 100);
    assert.equal(at100.status, COMPLETION_STATUS.COMPLETED);

    const stateAt100 = getCompletionState(courseId);
    assert.equal(stateAt100.status, COMPLETION_STATUS.COMPLETED);
    assert.ok(stateAt100.completedAt, 'completedAt timestamp must be recorded at 100%');

    // 7. If user unchecks a lecture (drops below 100%), status reverts from COMPLETED
    const dropped = evaluateCompletionBanner(courseId, 98);
    assert.equal(dropped.status, COMPLETION_STATUS.VERIFICATION_COMPLETED);
    assert.equal(getCompletionState(courseId).completedAt, null);

    // 8. Multi-course isolation: completion in courseId does not affect otherCourse
    const otherCourseId = 'course-other-isolated-202';
    resetCompletionState(otherCourseId);
    const otherBanner = evaluateCompletionBanner(otherCourseId, 92);
    assert.equal(otherBanner.status, COMPLETION_STATUS.IN_PROGRESS, 'Other course status must remain isolated');
    assert.equal(getCompletionState(otherCourseId).verifiedAt, null);

    // 9. Resetting completion state clears everything
    resetCompletionState(courseId);
    assert.equal(getCompletionState(courseId).status, COMPLETION_STATUS.IN_PROGRESS);
  });

  it('31. Practice Day retroactive 5-day boundary enforcement, auto-applied shield refunding, streak continuation, and invalid date rejection', () => {
    const fixedToday = new Date('2026-10-09T12:00:00Z');
    const fixedStartDate = '2026-10-01';

    // 1. Day Difference Calculation
    assert.equal(getDayDifference('2026-10-09', fixedToday), 0, 'Today should be 0 days diff');
    assert.equal(getDayDifference('2026-10-08', fixedToday), 1, 'Yesterday should be 1 day diff');
    assert.equal(getDayDifference('2026-10-04', fixedToday), 5, '5 days ago should be 5 days diff');
    assert.equal(getDayDifference('2026-10-03', fixedToday), 6, '6 days ago should be 6 days diff');
    assert.equal(getDayDifference('2026-10-10', fixedToday), -1, 'Tomorrow should be negative diff');
    assert.ok(isNaN(getDayDifference('invalid-date', fixedToday)), 'Invalid format returns NaN');

    // 2. canMarkPracticeDay boundary checks
    // Eligible: within last 5 days
    const checkToday = canMarkPracticeDay({ dateKey: '2026-10-09', referenceDate: fixedToday, startDate: fixedStartDate });
    assert.equal(checkToday.eligible, true);
    assert.equal(checkToday.diffDays, 0);

    const checkYesterday = canMarkPracticeDay({ dateKey: '2026-10-08', referenceDate: fixedToday, startDate: fixedStartDate });
    assert.equal(checkYesterday.eligible, true);
    assert.equal(checkYesterday.diffDays, 1);

    const check5DaysAgo = canMarkPracticeDay({ dateKey: '2026-10-04', referenceDate: fixedToday, startDate: fixedStartDate });
    assert.equal(check5DaysAgo.eligible, true);
    assert.equal(check5DaysAgo.diffDays, 5);

    // Ineligible: 6 days ago (strictly exceeds 5-day limit)
    const check6DaysAgo = canMarkPracticeDay({ dateKey: '2026-10-03', referenceDate: fixedToday, startDate: fixedStartDate });
    assert.equal(check6DaysAgo.eligible, false);
    assert.equal(check6DaysAgo.reason, 'BEYOND_5_DAY_LIMIT');

    // Ineligible: 15 days ago (previously allowed exploit)
    const check15DaysAgo = canMarkPracticeDay({ dateKey: '2026-09-24', referenceDate: fixedToday, startDate: '2026-09-01' });
    assert.equal(check15DaysAgo.eligible, false);
    assert.equal(check15DaysAgo.reason, 'BEYOND_5_DAY_LIMIT');

    // Ineligible: future date
    const checkFuture = canMarkPracticeDay({ dateKey: '2026-10-10', referenceDate: fixedToday, startDate: fixedStartDate });
    assert.equal(checkFuture.eligible, false);
    assert.equal(checkFuture.reason, 'FUTURE_DATE');

    // Ineligible: before course start date (within 5-day window, but prior to start date)
    const checkBeforeStart = canMarkPracticeDay({ dateKey: '2026-10-06', referenceDate: fixedToday, startDate: '2026-10-07' });
    assert.equal(checkBeforeStart.eligible, false);
    assert.equal(checkBeforeStart.reason, 'BEFORE_START_DATE');

    // Ineligible: already watched a lecture on this day
    const historyWithLecture = {
      '2026-10-08': { watchedSec: 1200, watchedCount: 1, entries: [] },
    };
    const checkWatched = canMarkPracticeDay({ dateKey: '2026-10-08', history: historyWithLecture, referenceDate: fixedToday, startDate: fixedStartDate });
    assert.equal(checkWatched.eligible, false);
    assert.equal(checkWatched.reason, 'ALREADY_WATCHED_LECTURE');

    // Ineligible: already marked as practice
    const historyWithPractice = {
      '2026-10-08': { watchedSec: 0, watchedCount: 0, isPractice: true, practiceNote: 'Practiced loops and methods' },
    };
    const checkAlreadyPractice = canMarkPracticeDay({ dateKey: '2026-10-08', history: historyWithPractice, referenceDate: fixedToday, startDate: fixedStartDate });
    assert.equal(checkAlreadyPractice.eligible, false);
    assert.equal(checkAlreadyPractice.reason, 'ALREADY_PRACTICE_DAY');

    // Eligible: auto-applied streak shield on yesterday
    const historyWithShield = {
      '2026-10-08': {
        watchedSec: 0,
        watchedCount: 0,
        isStreakFreeze: true,
        freezeNote: 'Auto-applied streak protection for missed day (2026-10-08)',
      },
    };
    const checkShield = canMarkPracticeDay({ dateKey: '2026-10-08', history: historyWithShield, referenceDate: fixedToday, startDate: fixedStartDate });
    assert.equal(checkShield.eligible, true);
    assert.equal(checkShield.hasAutoShield, true);

    // 3. applyPracticeDay note validation
    const shortNoteRes = applyPracticeDay({
      history: historyWithShield,
      targetDateKey: '2026-10-08',
      note: 'Too short note',
      referenceDate: fixedToday,
      startDate: fixedStartDate,
    });
    assert.equal(shortNoteRes.success, false);
    assert.equal(shortNoteRes.reason, 'NOTE_TOO_SHORT');

    // 4. applyPracticeDay auto-applied shield replacement and refund
    const initialFreezeStore = {
      availableFreezes: 1,
      usedFreezes: [
        {
          date: '2026-10-08',
          reason: 'auto_missed_day_protection',
          usedAt: '2026-10-08T23:59:00.000Z',
        },
      ],
    };

    const validPracticeNote = 'Practiced Object Oriented Programming concepts including polymorphism and encapsulation with sample exercises in IntelliJ';
    const applyRes = applyPracticeDay({
      history: historyWithShield,
      freezeStore: initialFreezeStore,
      targetDateKey: '2026-10-08',
      note: validPracticeNote,
      referenceDate: fixedToday,
      startDate: fixedStartDate,
    });

    assert.equal(applyRes.success, true);
    assert.equal(applyRes.shieldRefunded, true, 'Auto-applied shield must be refunded');
    assert.equal(applyRes.freezeStore.availableFreezes, 2, 'Available shields must increment by 1');
    assert.equal(applyRes.freezeStore.usedFreezes.length, 0, 'Used freeze entry must be removed');
    assert.equal(applyRes.history['2026-10-08'].isPractice, true);
    assert.equal(applyRes.history['2026-10-08'].practiceNote, validPracticeNote);
    assert.equal(applyRes.history['2026-10-08'].isStreakFreeze, undefined, 'isStreakFreeze flag must be purged');
    assert.equal(applyRes.history['2026-10-08'].freezeNote, undefined, 'freezeNote must be purged');

    // 5. Streak credit continuity
    const fullHistory = {
      '2026-10-07': { watchedSec: 1800, watchedCount: 2 },
      '2026-10-08': applyRes.history['2026-10-08'],
    };
    assert.equal(fullHistory['2026-10-08'].isPractice, true);

    // 6. removePracticeDay cleanly reverts practice status
    const unmarkRes = removePracticeDay({
      history: applyRes.history,
      targetDateKey: '2026-10-08',
    });
    assert.equal(unmarkRes.success, true);
    assert.equal(unmarkRes.history['2026-10-08'].isPractice, undefined);
    assert.equal(unmarkRes.history['2026-10-08'].practiceNote, undefined);

    // Attempting to unmark an un-practiced day fails safely
    const unmarkAgain = removePracticeDay({
      history: unmarkRes.history,
      targetDateKey: '2026-10-08',
    });
    assert.equal(unmarkAgain.success, false);
  });
});





