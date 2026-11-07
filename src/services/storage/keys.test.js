import { describe, it, expect } from 'vitest';
import {
  STORAGE_KEYS,
  COURSE_KEY_PREFIXES,
  COURSE_PREFIX_LIST,
  LEGACY_STORAGE_KEYS,
  SENSITIVE_STORAGE_KEYS,
  STORAGE_KEY_REGISTRY,
  STORAGE_PREFIX,
  TRACKING_VERSION,
  getWatchedKey,
  getTodayPlanKey,
  getSettingsKey,
  getHistoryKey,
  getStartDateKey,
  getStartDateManualKey,
  getBadgesKey,
  getStreakFreezesKey,
  getCompletionKey,
  getTrackingKey,
} from './keys.js';

describe('Storage Key Registry & Metadata', () => {
  it('defines exact static key names with 100% backwards compatibility', () => {
    expect(STORAGE_PREFIX).toBe('jct_');
    expect(STORAGE_KEYS.REGISTRY).toBe('jct_course_registry_v1');
    expect(STORAGE_KEYS.NOTIFICATIONS).toBe('jct_notifications_v1');
    expect(STORAGE_KEYS.NOTIFICATION_SETTINGS).toBe('jct_notification_settings_v1');
    expect(STORAGE_KEYS.OPENAI_API_KEY).toBe('jct_openai_api_key_v1');
    expect(STORAGE_KEYS.AI_API_KEYS).toBe('jct_ai_api_keys_v1');
    expect(STORAGE_KEYS.AI_FAB_HIDDEN).toBe('jct_ai_fab_hidden');
    expect(STORAGE_KEYS.MOTIVATION_STORE).toBe('jct_motivation_store_v2');
    expect(STORAGE_KEYS.PREFETCH_COOLDOWN).toBe('jct_prefetch_cooldown_v1');
    expect(STORAGE_KEYS.MOTIVATION_SHOWN).toBe('jct_motivation_shown_v1');
  });

  it('builds course-isolated namespaced keys matching characterization tests', () => {
    const courseId = 'core-java-ai';

    expect(getWatchedKey(courseId)).toBe('jct_watched__core-java-ai');
    expect(getTodayPlanKey(courseId)).toBe('jct_today_plan__core-java-ai');
    expect(getSettingsKey(courseId)).toBe('jct_settings__core-java-ai');
    expect(getHistoryKey(courseId)).toBe('jct_history__core-java-ai');
    expect(getStartDateKey(courseId)).toBe('jct_start_date__core-java-ai');
    expect(getStartDateManualKey(courseId)).toBe('jct_start_date_manual__core-java-ai');
    expect(getBadgesKey(courseId)).toBe('jct_badges__core-java-ai');
    expect(getStreakFreezesKey(courseId)).toBe('jct_streak_freezes__core-java-ai');
    expect(getCompletionKey(courseId)).toBe('jct_completion__core-java-ai');
    expect(getTrackingKey(courseId)).toBe(`jct_tracking__core-java-ai_${TRACKING_VERSION}`);
  });

  it('exports course prefix list and prefixes object for namespace cleanup', () => {
    expect(COURSE_KEY_PREFIXES.WATCHED).toBe('jct_watched__');
    expect(COURSE_KEY_PREFIXES.TODAY_PLAN).toBe('jct_today_plan__');
    expect(COURSE_KEY_PREFIXES.SETTINGS).toBe('jct_settings__');
    expect(COURSE_KEY_PREFIXES.HISTORY).toBe('jct_history__');
    expect(COURSE_KEY_PREFIXES.START_DATE).toBe('jct_start_date__');
    expect(COURSE_KEY_PREFIXES.START_DATE_MANUAL).toBe('jct_start_date_manual__');
    expect(COURSE_KEY_PREFIXES.BADGES).toBe('jct_badges__');
    expect(COURSE_KEY_PREFIXES.STREAK_FREEZES).toBe('jct_streak_freezes__');
    expect(COURSE_KEY_PREFIXES.COMPLETION).toBe('jct_completion__');
    expect(COURSE_KEY_PREFIXES.TRACKING).toBe('jct_tracking__');

    expect(COURSE_PREFIX_LIST).toContain('jct_watched__');
    expect(COURSE_PREFIX_LIST).toContain('jct_today_plan__');
    expect(COURSE_PREFIX_LIST).toContain('jct_completion__');
  });

  it('identifies sensitive keys strictly excluded from backup bundles', () => {
    expect(SENSITIVE_STORAGE_KEYS).toContain('jct_openai_api_key_v1');
    expect(SENSITIVE_STORAGE_KEYS).toContain('jct_ai_api_keys_v1');
    expect(SENSITIVE_STORAGE_KEYS).toContain('jct_openai_api_key');
  });

  it('includes complete schema metadata for all registered keys', () => {
    Object.entries(STORAGE_KEY_REGISTRY).forEach(([name, meta]) => {
      expect(meta.ownerFeature, `ownerFeature missing for ${name}`).toBeDefined();
      expect(meta.dataShape, `dataShape missing for ${name}`).toBeDefined();
      expect(typeof meta.isSensitive, `isSensitive boolean missing for ${name}`).toBe('boolean');
      expect(typeof meta.isInBackup, `isInBackup boolean missing for ${name}`).toBe('boolean');
    });

    // Verify critical sensitive keys are flagged as sensitive
    expect(STORAGE_KEY_REGISTRY[STORAGE_KEYS.OPENAI_API_KEY].isSensitive).toBe(true);
    expect(STORAGE_KEY_REGISTRY[STORAGE_KEYS.OPENAI_API_KEY].isInBackup).toBe(false);
    expect(STORAGE_KEY_REGISTRY[STORAGE_KEYS.AI_API_KEYS].isSensitive).toBe(true);
    expect(STORAGE_KEY_REGISTRY[STORAGE_KEYS.AI_API_KEYS].isInBackup).toBe(false);
    expect(STORAGE_KEY_REGISTRY['completion'].isSensitive).toBe(true);
  });
});
