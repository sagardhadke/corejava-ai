import { DEFAULT_COURSES } from './defaultCourses.js';
import { parseCourseXml } from './xmlCourseParser.js';
import {
  STORAGE_KEYS,
  COURSE_KEY_PREFIXES as COURSE_PREFIXES,
  SENSITIVE_STORAGE_KEYS as REGISTRY_SENSITIVE_KEYS,
  LEGACY_STORAGE_KEYS,
  STORAGE_PREFIX,
  isSensitiveKey,
} from '../services/storage/keys.js';
import { CURRENT_SCHEMA_VERSION } from '../services/storage/migrations/migrationRegistry.js';
import { migrateDataPayload } from '../services/storage/migrations/migrationRunner.js';

const REGISTRY_KEY = STORAGE_KEYS.REGISTRY; // { courseIds: [...], activeCourseId, customCourses: { [id]: courseObject } }

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

// Exhaustive list of all localStorage key prefixes owned by a specific course.
// Includes progress, plan, settings, history, start dates, badges, streak freezes, and completion states.
export const COURSE_KEY_PREFIXES = [
  COURSE_PREFIXES.WATCHED,
  COURSE_PREFIXES.TODAY_PLAN,
  COURSE_PREFIXES.SETTINGS,
  COURSE_PREFIXES.HISTORY,
  COURSE_PREFIXES.START_DATE,
  COURSE_PREFIXES.START_DATE_MANUAL,
  COURSE_PREFIXES.BADGES,
  COURSE_PREFIXES.STREAK_FREEZES,
  COURSE_PREFIXES.COMPLETION,
];

// Returns all exact keys belonging to a specific course.
export function getCourseKeyList(courseId) {
  if (!courseId) return [];
  return COURSE_KEY_PREFIXES.map((prefix) => `${prefix}${courseId}`);
}

// Removes every localStorage key that belongs to a specific course (progress,
// plan, settings, history, start date, badges, streak freezes, completion verification)
// — used when a course is deleted or replaced.
export function purgeCourseData(courseId) {
  if (!courseId) return;
  const prefixes = getCourseKeyList(courseId);
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

  // Purge any orphan course keys that might have been left over from corrupt/removed courses
  const orphanKeysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && COURSE_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      orphanKeysToRemove.push(key);
    }
  }
  orphanKeysToRemove.forEach((k) => localStorage.removeItem(k));

  localStorage.removeItem(REGISTRY_KEY);
  // Also clear any legacy/global keys from earlier single-course versions of the app.
  [
    LEGACY_STORAGE_KEYS.WATCHED_V1,
    LEGACY_STORAGE_KEYS.TODAY_PLAN_V1,
    LEGACY_STORAGE_KEYS.SETTINGS_V1_OLD,
    LEGACY_STORAGE_KEYS.HISTORY_V1,
    LEGACY_STORAGE_KEYS.MOTIVATION_SHOWN_V1,
  ].forEach((k) => localStorage.removeItem(k));
}

// ---- Backup & Restore ----
// Exports every piece of this app's data (registry + all courses' progress)
// into a single JSON-serializable object the user can save as a file.
// SECURITY GUARANTEE: Sensitive credentials (OpenAI API keys) are strictly
// stripped from exports to prevent credential leakage when sharing backups.

const APP_KEY_PREFIX = STORAGE_PREFIX;

const SENSITIVE_STORAGE_KEYS = new Set(REGISTRY_SENSITIVE_KEYS);

/**
 * Sanitizes stored values before inclusion in an export bundle.
 * Strips secret API keys from top-level keys and per-course settings.
 */
function sanitizeValueForExport(key, rawValue) {
  if (SENSITIVE_STORAGE_KEYS.has(key)) {
    return null; // Exclude top-level API key
  }
  if (key && key.startsWith(COURSE_PREFIXES.SETTINGS) && typeof rawValue === 'string') {
    try {
      const parsed = JSON.parse(rawValue);
      if (parsed && typeof parsed === 'object') {
        let modified = false;
        if ('apiKey' in parsed) {
          delete parsed.apiKey;
          modified = true;
        }
        if ('openaiApiKey' in parsed) {
          delete parsed.openaiApiKey;
          modified = true;
        }
        if (modified) {
          return JSON.stringify(parsed);
        }
      }
    } catch {
      // not json, keep as is
    }
  }
  return rawValue;
}

export function exportAllData({ includeApiKeys = false } = {}) {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(APP_KEY_PREFIX)) {
      if (key === STORAGE_KEYS.MIGRATION_BACKUP) {
        continue; // Strictly exclude rolling pre-migration snapshot from backups
      }
      if (!includeApiKeys && (SENSITIVE_STORAGE_KEYS.has(key) || isSensitiveKey(key))) {
        continue; // Strictly exclude sensitive credentials and hashes from backup
      }
      const rawValue = localStorage.getItem(key);
      const sanitized = includeApiKeys ? rawValue : sanitizeValueForExport(key, rawValue);
      if (sanitized !== null && sanitized !== undefined) {
        data[key] = sanitized;
      }
    }
  }
  return {
    appName: 'Core Java + AI Lecture Tracker',
    backupVersion: 1,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    sanitized: !includeApiKeys,
    data,
  };
}

export function importAllData(backup, { preserveExistingApiKey = true } = {}) {
  // 1. Structural validation of root object
  if (!backup || typeof backup !== 'object' || Array.isArray(backup)) {
    throw new Error('This file doesn\'t look like a valid backup for this app: backup root must be an object.');
  }

  // 2. Data payload structure validation
  if (!backup.data || typeof backup.data !== 'object' || Array.isArray(backup.data)) {
    throw new Error('This file doesn\'t look like a valid backup for this app: missing or malformed data payload.');
  }

  // 3. Backup version format check
  if (backup.backupVersion !== 1 && typeof backup.schemaVersion !== 'number') {
    throw new Error('This file doesn\'t look like a valid backup for this app: unrecognized backup format.');
  }

  // 4. Schema version guard: reject newer versions without modifying storage
  const backupSchemaVersion = typeof backup.schemaVersion === 'number' ? backup.schemaVersion : 0;
  if (backupSchemaVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Backup is from a newer schema version (${backupSchemaVersion}) than supported by this app version (${CURRENT_SCHEMA_VERSION}). Please update the app to restore this backup.`
    );
  }

  // 5. Value type and key format validation before touching any existing storage
  for (const [key, value] of Object.entries(backup.data)) {
    if (typeof key !== 'string' || !key.startsWith(APP_KEY_PREFIX)) {
      throw new Error(`Malformed backup data: key "${key}" is invalid. All keys must begin with "${APP_KEY_PREFIX}".`);
    }
    if (typeof value !== 'string') {
      throw new Error(`Malformed backup data: value for key "${key}" must be a string, got ${typeof value}.`);
    }
  }

  // 6. Run pending migrations on older backups before applying
  let dataToRestore = backup.data;
  if (backupSchemaVersion < CURRENT_SCHEMA_VERSION) {
    dataToRestore = migrateDataPayload(backup.data, backupSchemaVersion, CURRENT_SCHEMA_VERSION);
  }

  // 7. Preserve all device sensitive keys (API keys, multi-provider credentials, completion PIN hashes)
  const preservedSensitiveEntries = [];
  if (preserveExistingApiKey) {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && isSensitiveKey(k)) {
        const val = localStorage.getItem(k);
        if (val !== null && val !== undefined) {
          preservedSensitiveEntries.push([k, val]);
        }
      }
    }
  }

  // 8. Clear non-sensitive app keys so restore cleanly replaces application state
  const existingAppKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(APP_KEY_PREFIX) && !isSensitiveKey(key)) {
      existingAppKeys.push(key);
    }
  }
  existingAppKeys.forEach((k) => localStorage.removeItem(k));

  // 9. Write migrated backup data (strictly disallowing sensitive keys or rolling snapshot)
  Object.entries(dataToRestore).forEach(([key, value]) => {
    if (key.startsWith(APP_KEY_PREFIX) && !isSensitiveKey(key) && key !== STORAGE_KEYS.MIGRATION_BACKUP) {
      localStorage.setItem(key, value);
    }
  });

  // 10. Re-assert preserved device sensitive keys
  if (preserveExistingApiKey) {
    preservedSensitiveEntries.forEach(([k, v]) => {
      localStorage.setItem(k, v);
    });
  }

  // 11. Stamp current schema version into storage
  localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, String(CURRENT_SCHEMA_VERSION));
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
  if (!courseId) return 0;
  const prefixes = getCourseKeyList(courseId);
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (prefixes.some((p) => key === p || (key && key.startsWith(p)))) {
      total += (key.length + (localStorage.getItem(key) || '').length) * 2;
    }
  }
  return total;
}
