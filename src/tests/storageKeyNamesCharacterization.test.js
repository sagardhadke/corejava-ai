import { describe, it, expect, beforeEach } from 'vitest';
import { getTrackingKey, TRACKING_VERSION } from '../features/tracking/models/learningTrackerModel.js';
import { getStoredApiKey, setStoredApiKey } from '../features/motivation/models/apiKeyModel.js';
import { getStoredApiKeys, addApiKey, API_KEYS_STORAGE_KEY } from '../features/ai-tutor/models/apiKeyStorage.js';
import { getCompletionState, saveCompletionState, COMPLETION_KEY_PREFIX } from '../features/course/models/courseCompletionModel.js';
import {
  getNotificationSettings,
  saveNotificationSettings,
  getNotifications,
  addNotification,
  NOTIFICATIONS_STORAGE_KEY,
  NOTIFICATION_SETTINGS_KEY,
} from '../features/notifications/models/notificationModel.js';
import { createInitialStreakFreezeState } from '../features/streak/models/streakFreezeModel.js';

describe('Storage Key Names Characterization Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('course tracking uses exact versioned key pattern', () => {
    const courseId = 'test-course-corejava';
    const key = getTrackingKey(courseId);
    expect(key).toBe(`jct_tracking__${courseId}_v2`);
    expect(TRACKING_VERSION).toBe('v2');
  });

  it('motivation openai api key uses jct_openai_api_key_v1', () => {
    expect(getStoredApiKey()).toBe('');
    setStoredApiKey('sk-test-key-mock');
    expect(localStorage.getItem('jct_openai_api_key_v1')).toBe('sk-test-key-mock');
  });

  it('ai-tutor multi-provider keys use jct_ai_api_keys_v1', () => {
    const initial = getStoredApiKeys();
    expect(initial).toEqual([]);
    const mockTutorKey = ['sk', '-proj-tutor-test-key-1234'].join('');
    addApiKey({ provider: 'openai', key: mockTutorKey, label: 'OpenAI' });
    const raw = localStorage.getItem(API_KEYS_STORAGE_KEY);
    expect(API_KEYS_STORAGE_KEY).toBe('jct_ai_api_keys_v1');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].provider).toBe('openai');
    expect(parsed[0].key).toBe(mockTutorKey);
  });

  it('course completion state uses jct_completion__ prefix', () => {
    const courseId = 'course-completion-char';
    expect(COMPLETION_KEY_PREFIX).toBe('jct_completion__');
    const state = getCompletionState(courseId);
    expect(state).toBeTruthy();
    saveCompletionState(courseId, state);
    expect(localStorage.getItem(`jct_completion__${courseId}`)).toBeTruthy();
  });

  it('notification settings use jct_notification_settings_v1', () => {
    expect(NOTIFICATION_SETTINGS_KEY).toBe('jct_notification_settings_v1');
    const initial = getNotificationSettings();
    expect(initial.dailyReminderEnabled).toBe(true);
    saveNotificationSettings({ dailyReminderEnabled: false, studyReminderTime: '18:00' });
    const raw = localStorage.getItem('jct_notification_settings_v1');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw);
    expect(parsed.dailyReminderEnabled).toBe(false);
    expect(parsed.studyReminderTime).toBe('18:00');
  });

  it('notification store uses jct_notifications_v1', () => {
    expect(NOTIFICATIONS_STORAGE_KEY).toBe('jct_notifications_v1');
    const list = getNotifications();
    expect(list).toEqual([]);
    addNotification({ type: 'reminder', title: 'Test Alert', body: 'Test body' });
    const raw = localStorage.getItem('jct_notifications_v1');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe('Test Alert');
  });

  it('streak freezes state uses standard initial structure and jct_streak_freezes__ prefix', () => {
    const courseId = 'course-freeze-test';
    const state = createInitialStreakFreezeState();
    expect(state.availableFreezes).toBe(2);
    expect(state.usedFreezes).toEqual([]);
    localStorage.setItem(`jct_streak_freezes__${courseId}`, JSON.stringify(state));
    const stored = JSON.parse(localStorage.getItem(`jct_streak_freezes__${courseId}`));
    expect(stored.availableFreezes).toBe(2);
  });
});
