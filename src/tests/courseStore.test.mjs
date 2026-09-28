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

    const backup = exportAllData();
    assert.equal(backup.backupVersion, 1);
    assert.ok(backup.data['jct_course_registry_v1']);
    assert.ok(backup.data['jct_watched__core-java-ai']);
    assert.ok(backup.data[`jct_watched__${SAMPLE_COURSE_1.id}`]);

    // Clear everything
    localStorage.clear();
    assert.equal(listCourses().length, 1);

    // Restore from backup
    importAllData(backup);
    const restoredCourses = listCourses();
    assert.equal(restoredCourses.length, 2);
    assert.equal(localStorage.getItem('jct_watched__core-java-ai'), JSON.stringify({ 'w1': true }));
    assert.equal(localStorage.getItem(`jct_watched__${SAMPLE_COURSE_1.id}`), JSON.stringify({ 'w2': true }));
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
});
