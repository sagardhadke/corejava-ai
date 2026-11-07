import { describe, it, expect, beforeEach } from 'vitest';
import { importAllData } from '../data/courseStore.js';
import { STORAGE_KEYS } from '../services/storage/keys.js';

describe('BUG REPRODUCTION: Backup Restore Wipes Provider Credentials', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('preserves all provider keys (OpenAI, Gemini, Anthropic, Groq) when restoring a backup', () => {
    const mockOpenAi = ['sk', '-proj-openai-credential-test-12345'].join('');
    const mockAnthropic = ['sk', '-ant-credential-test-1234567890'].join('');
    const mockGemini = ['AIza', 'Sy-test-key-credential-1234567890'].join('');
    const mockGroq = ['gsk', '_credentialTestKey1234567890123456'].join('');

    // User configures all 4 provider keys on their device in multi-provider store
    localStorage.setItem(
      STORAGE_KEYS.AI_API_KEYS,
      JSON.stringify([
        { id: 'k1', provider: 'openai', key: mockOpenAi },
        { id: 'k2', provider: 'anthropic', key: mockAnthropic },
        { id: 'k3', provider: 'gemini', key: mockGemini },
        { id: 'k4', provider: 'groq', key: mockGroq },
      ])
    );

    // Also store individual/legacy keys as previous versions of the app stored them
    localStorage.setItem(STORAGE_KEYS.OPENAI_API_KEY, mockOpenAi);
    localStorage.setItem('jct_groq_api_key', mockGroq);
    localStorage.setItem('jct_anthropic_api_key', mockAnthropic);
    localStorage.setItem('jct_gemini_api_key', mockGemini);

    // Verify all keys are present before restore
    expect(localStorage.getItem(STORAGE_KEYS.OPENAI_API_KEY)).toBe(mockOpenAi);
    expect(localStorage.getItem('jct_groq_api_key')).toBe(mockGroq);
    expect(localStorage.getItem('jct_anthropic_api_key')).toBe(mockAnthropic);
    expect(localStorage.getItem('jct_gemini_api_key')).toBe(mockGemini);

    // Incoming course backup bundle from another device/course export (contains NO keys)
    const backup = {
      appName: 'Core Java + AI Lecture Tracker',
      backupVersion: 1,
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      sanitized: true,
      data: {
        'jct_course_registry_v1': JSON.stringify(['course-restored']),
        'jct_watched__course-restored': JSON.stringify(['l1', 'l2']),
      },
    };

    // Restore course backup
    importAllData(backup);

    // BUG REPRODUCTION CHECK:
    // Restoring a course backup must NEVER wipe user provider credentials on the device!
    const restoredKeys = JSON.parse(localStorage.getItem(STORAGE_KEYS.AI_API_KEYS) || '[]');
    expect(restoredKeys.find((k) => k.provider === 'openai')?.key).toBe(mockOpenAi);
    expect(restoredKeys.find((k) => k.provider === 'anthropic')?.key).toBe(mockAnthropic);
    expect(restoredKeys.find((k) => k.provider === 'gemini')?.key).toBe(mockGemini);
    expect(restoredKeys.find((k) => k.provider === 'groq')?.key).toBe(mockGroq);

    expect(localStorage.getItem(STORAGE_KEYS.OPENAI_API_KEY)).toBe(mockOpenAi);
    expect(localStorage.getItem('jct_groq_api_key')).toBe(mockGroq);
    expect(localStorage.getItem('jct_anthropic_api_key')).toBe(mockAnthropic);
    expect(localStorage.getItem('jct_gemini_api_key')).toBe(mockGemini);
  });
});
