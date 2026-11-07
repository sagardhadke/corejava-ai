import { describe, it, expect, beforeEach } from 'vitest';
import { exportAllData, importAllData } from '../data/courseStore.js';

describe('importAllData Characterization Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('exportAllData creates valid backup structure without sensitive API keys', () => {
    localStorage.setItem('jct_course_registry_v1', JSON.stringify(['course-1']));
    localStorage.setItem('jct_watched__course-1', JSON.stringify(['l1', 'l2']));
    localStorage.setItem('jct_openai_api_key_v1', ['sk', '-secret-key-12345'].join(''));
    localStorage.setItem('jct_ai_api_keys_v1', JSON.stringify({ version: 'v1', keys: {} }));

    const backup = exportAllData();
    expect(backup).toMatchObject({
      appName: 'Core Java + AI Lecture Tracker',
      backupVersion: 1,
      sanitized: true,
    });
    expect(backup.data['jct_course_registry_v1']).toBeTruthy();
    expect(backup.data['jct_watched__course-1']).toBeTruthy();
    expect(backup.data['jct_openai_api_key_v1']).toBeUndefined();
    expect(backup.data['jct_ai_api_keys_v1']).toBeUndefined();
  });

  it('importAllData throws descriptive error on invalid backup payloads', () => {
    expect(() => importAllData(null)).toThrow(/valid backup/);
    expect(() => importAllData({})).toThrow(/valid backup/);
    expect(() => importAllData({ backupVersion: 2, data: {} })).toThrow(/valid backup/);
    expect(() => importAllData({ backupVersion: 1 })).toThrow(/valid backup/);
  });

  it('importAllData wipes existing jct_ keys and restores backup data', () => {
    localStorage.setItem('jct_watched__old-course', JSON.stringify(['old-lecture']));
    localStorage.setItem('unrelated_key', 'keep_me');

    const backup = {
      appName: 'Core Java + AI Lecture Tracker',
      backupVersion: 1,
      data: {
        'jct_course_registry_v1': JSON.stringify(['new-course']),
        'jct_watched__new-course': JSON.stringify(['new-l1']),
      },
    };

    importAllData(backup);

    // Old jct_ keys removed
    expect(localStorage.getItem('jct_watched__old-course')).toBeNull();
    // Non-jct keys untouched
    expect(localStorage.getItem('unrelated_key')).toBe('keep_me');
    // New backup data written
    expect(localStorage.getItem('jct_course_registry_v1')).toBe(JSON.stringify(['new-course']));
    expect(localStorage.getItem('jct_watched__new-course')).toBe(JSON.stringify(['new-l1']));
  });

  it('importAllData preserves existing openai API key if backup does not provide one', () => {
    const mockPreservedKey = ['sk', '-local-preserved-key-mock'].join('');
    localStorage.setItem('jct_openai_api_key_v1', mockPreservedKey);

    const backup = {
      appName: 'Core Java + AI Lecture Tracker',
      backupVersion: 1,
      data: {
        'jct_course_registry_v1': JSON.stringify(['course-xyz']),
      },
    };

    importAllData(backup, { preserveExistingApiKey: true });

    expect(localStorage.getItem('jct_openai_api_key_v1')).toBe(mockPreservedKey);
  });
});
