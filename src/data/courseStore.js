import { DEFAULT_COURSES } from './defaultCourses.js';
import { parseCourseXml } from './xmlCourseParser.js';

const REGISTRY_KEY = 'jct_course_registry_v1'; // { courseIds: [...], activeCourseId, customCourses: { [id]: courseObject } }

// The set of default course ids that ship with the app. These are never
// stored in localStorage themselves (they come from defaultCourses.js), only
// referenced by id in the registry — this keeps the initial page load fast
// and the localStorage footprint small.
const DEFAULT_COURSE_IDS = DEFAULT_COURSES.map((c) => c.id);
const DEFAULT_COURSE_BY_ID = new Map(DEFAULT_COURSES.map((c) => [c.id, c]));

function computeDerived(course) {
  const allLectures = course.sections.flatMap((s) =>
    s.lectures.map((l) => ({ ...l, sectionId: s.id, sectionTitle: s.title, sectionNumber: s.number }))
  );
  return {
    ...course,
    allLectures,
    totalSeconds: allLectures.reduce((sum, l) => sum + l.durationSec, 0),
    lectureCount: allLectures.length,
  };
}

function loadRegistry() {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Guard against a corrupt/partial registry.
      if (parsed && Array.isArray(parsed.courseIds) && parsed.activeCourseId) {
        const customCourses = parsed.customCourses || {};
        // Keep only ids that actually exist (either in DEFAULT_COURSE_BY_ID or in customCourses)
        const validIds = parsed.courseIds.filter(
          (id) => DEFAULT_COURSE_BY_ID.has(id) || !!customCourses[id]
        );

        if (validIds.length > 0) {
          const activeId = validIds.includes(parsed.activeCourseId)
            ? parsed.activeCourseId
            : validIds[0];
          return {
            courseIds: validIds,
            activeCourseId: activeId,
            customCourses,
          };
        }
      }
    }
  } catch {
    // fall through to default
  }
  return {
    courseIds: [...DEFAULT_COURSE_IDS],
    activeCourseId: DEFAULT_COURSE_IDS[0],
    customCourses: {},
  };
}

function saveRegistry(registry) {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
}

// Removes every localStorage key that belongs to a specific course (progress,
// plan, settings, history, start date) — used when a course is deleted or replaced.
function purgeCourseData(courseId) {
  const prefixes = [
    `jct_watched__${courseId}`,
    `jct_today_plan__${courseId}`,
    `jct_settings__${courseId}`,
    `jct_history__${courseId}`,
    `jct_start_date__${courseId}`,
  ];
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (prefixes.some((p) => key === p || (key && key.startsWith(p)))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

export function getCourseById(courseId) {
  if (DEFAULT_COURSE_BY_ID.has(courseId)) {
    return computeDerived(DEFAULT_COURSE_BY_ID.get(courseId));
  }
  const registry = loadRegistry();
  const custom = registry.customCourses[courseId];
  return custom ? computeDerived(custom) : null;
}

export function listCourses() {
  const registry = loadRegistry();
  return registry.courseIds
    .map((id) => {
      const course = getCourseById(id);
      return course ? { id: course.id, title: course.title, lectureCount: course.lectureCount, isDefault: DEFAULT_COURSE_BY_ID.has(id) } : null;
    })
    .filter(Boolean);
}

export function getActiveCourseId() {
  return loadRegistry().activeCourseId;
}

export function setActiveCourseId(courseId) {
  const registry = loadRegistry();
  if (!registry.courseIds.includes(courseId)) return false;
  registry.activeCourseId = courseId;
  saveRegistry(registry);
  return true;
}

// Parses and validates XML text into a course object without touching the
// registry yet — used to preview/confirm before the user picks "replace" or
// "add alongside".
export function previewCourseXml(xmlText) {
  return parseCourseXml(xmlText); // throws with a descriptive message on invalid input
}

// Adds a parsed course alongside existing ones, makes it active, returns its id.
export function addCourse(course) {
  const registry = loadRegistry();
  registry.customCourses[course.id] = course;
  if (!registry.courseIds.includes(course.id)) registry.courseIds.push(course.id);
  registry.activeCourseId = course.id;
  saveRegistry(registry);
  return course.id;
}

// Replaces the currently active course entirely: removes its saved progress
// and removes it from the registry (whether it was a default or a custom
// course — "replace" always removes the old course from the list, the same
// way regardless of its origin), then adds the new course as the sole active
// one. Note this is different from a fresh install, which always ships with
// the default courses present — replacing a default course is an explicit
// user action and is allowed to remove it.
export function replaceCourse(oldCourseId, newCourse) {
  const registry = loadRegistry();
  purgeCourseData(oldCourseId);
  purgeCourseData(newCourse.id);

  delete registry.customCourses[oldCourseId];
  registry.courseIds = registry.courseIds.filter((id) => id !== oldCourseId);

  registry.customCourses[newCourse.id] = newCourse;
  if (!registry.courseIds.includes(newCourse.id)) registry.courseIds.push(newCourse.id);
  registry.activeCourseId = newCourse.id;
  saveRegistry(registry);
  return newCourse.id;
}

// Deletes a course from the registry and purges its saved progress. Refuses
// to delete the last remaining course — at least one must always exist.
// If the active course is deleted, falls back to the first remaining one.
export function deleteCourse(courseId) {
  const registry = loadRegistry();
  if (registry.courseIds.length <= 1) {
    return { ok: false, reason: 'At least one course must remain.' };
  }
  purgeCourseData(courseId);
  if (!DEFAULT_COURSE_BY_ID.has(courseId)) {
    delete registry.customCourses[courseId];
  }
  registry.courseIds = registry.courseIds.filter((id) => id !== courseId);
  if (registry.activeCourseId === courseId) {
    registry.activeCourseId = registry.courseIds[0];
  }
  saveRegistry(registry);
  return { ok: true };
}

// Full factory reset: clears the registry and every course's progress data,
// restoring the exact state of a fresh install (default courses only, first
// one active, no watched/plan/settings/history for any course).
export function resetEverything() {
  const registry = loadRegistry();
  const allIds = new Set([...registry.courseIds, ...Object.keys(registry.customCourses)]);
  allIds.forEach((id) => purgeCourseData(id));
  localStorage.removeItem(REGISTRY_KEY);
  // Also clear any legacy/global keys from earlier single-course versions of the app.
  ['jct_watched_v1', 'jct_today_plan_v1', 'jct_settings_v1', 'jct_history_v1',
   'jct_motivation_shown_v1'].forEach((k) => localStorage.removeItem(k));
}

// ---- Backup & Restore ----
// Exports every piece of this app's data (registry + all courses' progress)
// into a single JSON-serializable object the user can save as a file.

const APP_KEY_PREFIX = 'jct_';

export function exportAllData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(APP_KEY_PREFIX)) {
      data[key] = localStorage.getItem(key);
    }
  }
  return {
    appName: 'Core Java + AI Lecture Tracker',
    backupVersion: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function importAllData(backup) {
  if (!backup || typeof backup !== 'object' || !backup.data || backup.backupVersion !== 1) {
    throw new Error('This file doesn\'t look like a valid backup for this app.');
  }
  // Clear all existing app keys first, so a restore fully replaces state
  // rather than merging with whatever was already there.
  const existingKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(APP_KEY_PREFIX)) existingKeys.push(key);
  }
  existingKeys.forEach((k) => localStorage.removeItem(k));

  Object.entries(backup.data).forEach(([key, value]) => {
    if (key.startsWith(APP_KEY_PREFIX)) {
      localStorage.setItem(key, value);
    }
  });
}

// ---- Memory / storage usage ----

export function getStorageUsageBytes() {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key) || '';
    total += (key ? key.length : 0) + value.length;
  }
  return total * 2; // JS strings are UTF-16, ~2 bytes/char
}

export function getPerCourseStorageBytes(courseId) {
  const prefixes = [
    `jct_watched__${courseId}`,
    `jct_today_plan__${courseId}`,
    `jct_settings__${courseId}`,
    `jct_history__${courseId}`,
    `jct_start_date__${courseId}`,
  ];
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (prefixes.includes(key)) {
      total += (key.length + (localStorage.getItem(key) || '').length) * 2;
    }
  }
  return total;
}
