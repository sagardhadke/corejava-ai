/**
 * Central Storage Key Registry
 *
 * Single source of truth for all storage keys, dynamic key builders,
 * and key metadata across the application.
 *
 * Preserves 100% exact backwards compatibility with all existing keys.
 */

export const STORAGE_PREFIX = 'jct_';

/**
 * Static global storage keys
 */
export const STORAGE_KEYS = Object.freeze({
  /**
   * Owner: course
   * Shape: { courseIds: string[], activeCourseId: string, customCourses: Record<string, object> }
   * Sensitive: No
   * In Backup: Yes
   */
  REGISTRY: 'jct_course_registry_v1',

  /**
   * Owner: notifications
   * Shape: NotificationItem[]
   * Sensitive: No
   * In Backup: Yes
   */
  NOTIFICATIONS: 'jct_notifications_v1',

  /**
   * Owner: notifications
   * Shape: { enabled: boolean, reminderTime: string, milestoneAlerts: boolean, streakAlerts: boolean }
   * Sensitive: No
   * In Backup: Yes
   */
  NOTIFICATION_SETTINGS: 'jct_notification_settings_v1',

  /**
   * Owner: motivation
   * Shape: string (plaintext OpenAI secret key)
   * Sensitive: YES (Critical secret)
   * In Backup: NO (Strictly excluded)
   */
  OPENAI_API_KEY: 'jct_openai_api_key_v1',

  /**
   * Owner: ai-tutor
   * Shape: ApiKeyRecord[] ([{ id, provider, key, label, createdAt }])
   * Sensitive: YES (Critical secrets)
   * In Backup: NO (Strictly excluded)
   */
  AI_API_KEYS: 'jct_ai_api_keys_v1',

  /**
   * Owner: ai-tutor
   * Shape: 'true' | 'false' (whether user dismissed floating tutor button)
   * Sensitive: No
   * In Backup: Yes
   */
  AI_FAB_HIDDEN: 'jct_ai_fab_hidden',

  /**
   * Owner: motivation
   * Shape: { queue: Quote[], seenIds: string[] }
   * Sensitive: No
   * In Backup: Yes
   */
  MOTIVATION_STORE: 'jct_motivation_store_v2',

  /**
   * Owner: motivation
   * Shape: { until: number } (timestamp ms)
   * Sensitive: No
   * In Backup: Yes
   */
  PREFETCH_COOLDOWN: 'jct_prefetch_cooldown_v1',

  /**
   * Owner: motivation
   * Shape: { date: string } (ISO date YYYY-MM-DD)
   * Sensitive: No
   * In Backup: Yes
   */
  MOTIVATION_SHOWN: 'jct_motivation_shown_v1',

  /**
   * Owner: storage
   * Shape: number (schema version integer, e.g. 1)
   * Sensitive: No
   * In Backup: Yes
   */
  SCHEMA_VERSION: 'jct_schema_version',

  /**
   * Owner: storage
   * Shape: { timestamp: string, fromVersion: number, data: Record<string, string> }
   * Sensitive: No
   * In Backup: NO (Rolling pre-migration safety snapshot)
   */
  MIGRATION_BACKUP: 'jct_migration_backup_latest',
});

/**
 * Dynamic per-course key prefixes
 */
export const COURSE_KEY_PREFIXES = Object.freeze({
  WATCHED: 'jct_watched__',
  TODAY_PLAN: 'jct_today_plan__',
  SETTINGS: 'jct_settings__',
  HISTORY: 'jct_history__',
  START_DATE: 'jct_start_date__',
  START_DATE_MANUAL: 'jct_start_date_manual__',
  BADGES: 'jct_badges__',
  STREAK_FREEZES: 'jct_streak_freezes__',
  COMPLETION: 'jct_completion__',
  TRACKING: 'jct_tracking__',
});

/**
 * Tracking version suffix
 */
export const TRACKING_VERSION = 'v2';

/**
 * Key builder functions for course-isolated namespaces
 */
export function getWatchedKey(courseId) {
  return `${COURSE_KEY_PREFIXES.WATCHED}${courseId}`;
}

export function getTodayPlanKey(courseId) {
  return `${COURSE_KEY_PREFIXES.TODAY_PLAN}${courseId}`;
}

export function getSettingsKey(courseId) {
  return `${COURSE_KEY_PREFIXES.SETTINGS}${courseId}`;
}

export function getHistoryKey(courseId) {
  return `${COURSE_KEY_PREFIXES.HISTORY}${courseId}`;
}

export function getStartDateKey(courseId) {
  return `${COURSE_KEY_PREFIXES.START_DATE}${courseId}`;
}

export function getStartDateManualKey(courseId) {
  return `${COURSE_KEY_PREFIXES.START_DATE_MANUAL}${courseId}`;
}

export function getBadgesKey(courseId) {
  return `${COURSE_KEY_PREFIXES.BADGES}${courseId}`;
}

export function getStreakFreezesKey(courseId) {
  return `${COURSE_KEY_PREFIXES.STREAK_FREEZES}${courseId}`;
}

export function getCompletionKey(courseId) {
  return `${COURSE_KEY_PREFIXES.COMPLETION}${courseId}`;
}

export function getTrackingKey(courseId) {
  return `${COURSE_KEY_PREFIXES.TRACKING}${courseId}_${TRACKING_VERSION}`;
}

/**
 * Array of course key prefixes used for cascading deletion and purging
 */
export const COURSE_PREFIX_LIST = Object.freeze([
  COURSE_KEY_PREFIXES.WATCHED,
  COURSE_KEY_PREFIXES.TODAY_PLAN,
  COURSE_KEY_PREFIXES.SETTINGS,
  COURSE_KEY_PREFIXES.HISTORY,
  COURSE_KEY_PREFIXES.START_DATE,
  COURSE_KEY_PREFIXES.START_DATE_MANUAL,
  COURSE_KEY_PREFIXES.BADGES,
  COURSE_KEY_PREFIXES.STREAK_FREEZES,
  COURSE_KEY_PREFIXES.COMPLETION,
  COURSE_KEY_PREFIXES.TRACKING,
]);

/**
 * Legacy storage keys recognized during migrations and cleanup
 */
export const LEGACY_STORAGE_KEYS = Object.freeze({
  OPENAI_API_KEY: 'jct_openai_api_key',
  SETTINGS_V1: 'course_tracker_settings_v1',
  WATCHED_V1: 'jct_watched_v1',
  TODAY_PLAN_V1: 'jct_today_plan_v1',
  SETTINGS_V1_OLD: 'jct_settings_v1',
  HISTORY_V1: 'jct_history_v1',
  MOTIVATION_SHOWN_V1: 'jct_motivation_shown_v1',
});

/**
 * Sensitive storage keys that must NEVER be written to backup export payloads
 */
export const SENSITIVE_STORAGE_KEYS = Object.freeze([
  STORAGE_KEYS.OPENAI_API_KEY,
  STORAGE_KEYS.AI_API_KEYS,
  LEGACY_STORAGE_KEYS.OPENAI_API_KEY,
  'jct_openai_key',
  'jct_api_key',
  'jct_anthropic_api_key',
  'jct_gemini_api_key',
]);

/**
 * Checks whether a storage key is sensitive (contains API credentials,
 * secrets, or cryptographic PIN verification hashes).
 *
 * Sensitive keys:
 * - Top-level API keys (OpenAI, Gemini, Anthropic, AI Tutor multi-provider keys)
 * - Completion verification state keys (contain PIN hashes and cryptographic salt)
 * - Keys matching API key naming conventions
 *
 * @param {string} key
 * @returns {boolean}
 */
export function isSensitiveKey(key) {
  if (!key || typeof key !== 'string') return false;
  if (SENSITIVE_STORAGE_KEYS.includes(key)) return true;
  if (key.startsWith(COURSE_KEY_PREFIXES.COMPLETION)) return true;
  if (/^jct_.*(?:api_key|secret|token)/i.test(key)) return true;
  return false;
}

/**
 * Structured metadata registry for all active keys and builders
 */
export const STORAGE_KEY_REGISTRY = Object.freeze({
  [STORAGE_KEYS.REGISTRY]: {
    key: STORAGE_KEYS.REGISTRY,
    ownerFeature: 'course',
    dataShape: '{ courseIds: string[], activeCourseId: string, customCourses: Record<string, object> }',
    isSensitive: false,
    isInBackup: true,
  },
  [STORAGE_KEYS.NOTIFICATIONS]: {
    key: STORAGE_KEYS.NOTIFICATIONS,
    ownerFeature: 'notifications',
    dataShape: 'NotificationItem[]',
    isSensitive: false,
    isInBackup: true,
  },
  [STORAGE_KEYS.NOTIFICATION_SETTINGS]: {
    key: STORAGE_KEYS.NOTIFICATION_SETTINGS,
    ownerFeature: 'notifications',
    dataShape: '{ enabled: boolean, reminderTime: string, milestoneAlerts: boolean, streakAlerts: boolean }',
    isSensitive: false,
    isInBackup: true,
  },
  [STORAGE_KEYS.OPENAI_API_KEY]: {
    key: STORAGE_KEYS.OPENAI_API_KEY,
    ownerFeature: 'motivation',
    dataShape: 'string (plaintext API key)',
    isSensitive: true,
    isInBackup: false,
  },
  [STORAGE_KEYS.AI_API_KEYS]: {
    key: STORAGE_KEYS.AI_API_KEYS,
    ownerFeature: 'ai-tutor',
    dataShape: 'ApiKeyRecord[]',
    isSensitive: true,
    isInBackup: false,
  },
  [STORAGE_KEYS.AI_FAB_HIDDEN]: {
    key: STORAGE_KEYS.AI_FAB_HIDDEN,
    ownerFeature: 'ai-tutor',
    dataShape: "'true' | 'false'",
    isSensitive: false,
    isInBackup: true,
  },
  [STORAGE_KEYS.MOTIVATION_STORE]: {
    key: STORAGE_KEYS.MOTIVATION_STORE,
    ownerFeature: 'motivation',
    dataShape: '{ queue: Quote[], seenIds: string[] }',
    isSensitive: false,
    isInBackup: true,
  },
  [STORAGE_KEYS.PREFETCH_COOLDOWN]: {
    key: STORAGE_KEYS.PREFETCH_COOLDOWN,
    ownerFeature: 'motivation',
    dataShape: '{ until: number }',
    isSensitive: false,
    isInBackup: true,
  },
  [STORAGE_KEYS.MOTIVATION_SHOWN]: {
    key: STORAGE_KEYS.MOTIVATION_SHOWN,
    ownerFeature: 'motivation',
    dataShape: '{ date: string }',
    isSensitive: false,
    isInBackup: true,
  },
  [STORAGE_KEYS.SCHEMA_VERSION]: {
    key: STORAGE_KEYS.SCHEMA_VERSION,
    ownerFeature: 'storage',
    dataShape: 'number (schema version integer, e.g. 1)',
    isSensitive: false,
    isInBackup: true,
  },
  [STORAGE_KEYS.MIGRATION_BACKUP]: {
    key: STORAGE_KEYS.MIGRATION_BACKUP,
    ownerFeature: 'storage',
    dataShape: '{ timestamp: string, fromVersion: number, data: Record<string, string> }',
    isSensitive: false,
    isInBackup: false,
  },
  'watched': {
    builder: getWatchedKey,
    prefix: COURSE_KEY_PREFIXES.WATCHED,
    ownerFeature: 'course',
    dataShape: 'string[] (completed lecture IDs)',
    isSensitive: false,
    isInBackup: true,
  },
  'today_plan': {
    builder: getTodayPlanKey,
    prefix: COURSE_KEY_PREFIXES.TODAY_PLAN,
    ownerFeature: 'today-plan',
    dataShape: 'string[] (planned lecture IDs)',
    isSensitive: false,
    isInBackup: true,
  },
  'settings': {
    builder: getSettingsKey,
    prefix: COURSE_KEY_PREFIXES.SETTINGS,
    ownerFeature: 'settings',
    dataShape: '{ dailyTargetHours: number, streakMode: string, autoPlan: boolean, apiKey?: string }',
    isSensitive: false,
    isInBackup: true,
  },
  'history': {
    builder: getHistoryKey,
    prefix: COURSE_KEY_PREFIXES.HISTORY,
    ownerFeature: 'streak',
    dataShape: 'Record<string, { watchedCount: number, watchedSec: number, isPractice: boolean }>',
    isSensitive: false,
    isInBackup: true,
  },
  'start_date': {
    builder: getStartDateKey,
    prefix: COURSE_KEY_PREFIXES.START_DATE,
    ownerFeature: 'streak',
    dataShape: 'string (ISO date YYYY-MM-DD)',
    isSensitive: false,
    isInBackup: true,
  },
  'start_date_manual': {
    builder: getStartDateManualKey,
    prefix: COURSE_KEY_PREFIXES.START_DATE_MANUAL,
    ownerFeature: 'streak',
    dataShape: "'true' | 'false'",
    isSensitive: false,
    isInBackup: true,
  },
  'badges': {
    builder: getBadgesKey,
    prefix: COURSE_KEY_PREFIXES.BADGES,
    ownerFeature: 'badges',
    dataShape: 'Record<string, { unlockedAt: string }>',
    isSensitive: false,
    isInBackup: true,
  },
  'streak_freezes': {
    builder: getStreakFreezesKey,
    prefix: COURSE_KEY_PREFIXES.STREAK_FREEZES,
    ownerFeature: 'streak',
    dataShape: '{ availableFreezes: number, usedFreezes: number, freezeHistory: string[] }',
    isSensitive: false,
    isInBackup: true,
  },
  'completion': {
    builder: getCompletionKey,
    prefix: COURSE_KEY_PREFIXES.COMPLETION,
    ownerFeature: 'course',
    dataShape: '{ completedAt: string, verificationPinHash: string, salt: string, attempts: number }',
    isSensitive: true,
    isInBackup: true,
  },
  'tracking': {
    builder: getTrackingKey,
    prefix: COURSE_KEY_PREFIXES.TRACKING,
    ownerFeature: 'tracking',
    dataShape: '{ version: "v2", dailyLog: Record<string, DailyTrackingEntry>, velocityEWMA: number }',
    isSensitive: false,
    isInBackup: true,
  },
});
