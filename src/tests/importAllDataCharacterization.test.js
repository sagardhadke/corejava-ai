import { describe, it, expect, beforeEach } from 'vitest';
import { exportAllData, importAllData } from '../data/courseStore.js';
import { STORAGE_KEYS } from '../services/storage/keys.js';
import { CURRENT_SCHEMA_VERSION } from '../services/storage/migrations/migrationRegistry.js';

describe('importAllData Characterization Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('exportAllData creates valid backup structure without sensitive API keys', () => {
    localStorage.setItem('jct_course_registry_v1', JSON.stringify(['course-1']));
    localStorage.setItem('jct_watched__course-1', JSON.stringify(['l1', 'l2']));
    localStorage.setItem('jct_openai_api_key_v1', ['sk', '-secret-key-12345'].join(''));
    localStorage.setItem('jct_ai_api_keys_v1', JSON.stringify({ version: 'v1', keys: {} }));
    localStorage.setItem('jct_migration_backup_latest', JSON.stringify({ timestamp: 'now', data: {} }));

    const backup = exportAllData();
    expect(backup).toMatchObject({
      appName: 'Core Java + AI Lecture Tracker',
      backupVersion: 1,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      sanitized: true,
    });
    expect(backup.exportedAt).toBeDefined();
    expect(backup.data['jct_course_registry_v1']).toBeTruthy();
    expect(backup.data['jct_watched__course-1']).toBeTruthy();
    expect(backup.data['jct_openai_api_key_v1']).toBeUndefined();
    expect(backup.data['jct_ai_api_keys_v1']).toBeUndefined();
    expect(backup.data['jct_migration_backup_latest']).toBeUndefined();
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
      schemaVersion: 1,
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
    // Schema version stamped
    expect(localStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION)).toBe('1');
  });

  it('importAllData preserves all device credentials on restore', () => {
    const mockOpenAiKey = ['sk', '-local-preserved-key-mock'].join('');
    const mockTutorKey = ['sk', '-local-tutor-key-mock'].join('');
    localStorage.setItem('jct_openai_api_key_v1', mockOpenAiKey);
    localStorage.setItem('jct_ai_api_keys_v1', JSON.stringify([{ id: 'k1', key: mockTutorKey }]));
    localStorage.setItem('jct_completion__course-xyz', JSON.stringify({ pinHash: 'hash-abc', salt: 'salt-def' }));

    const backup = {
      appName: 'Core Java + AI Lecture Tracker',
      backupVersion: 1,
      schemaVersion: 1,
      data: {
        'jct_course_registry_v1': JSON.stringify(['course-xyz']),
      },
    };

    importAllData(backup, { preserveExistingApiKey: true });

    // Assert that OpenAI key, AI Tutor multi-provider keys, and completion verification hashes are ALL preserved
    expect(localStorage.getItem('jct_openai_api_key_v1')).toBe(mockOpenAiKey);
    expect(localStorage.getItem('jct_ai_api_keys_v1')).toBe(JSON.stringify([{ id: 'k1', key: mockTutorKey }]));
    expect(localStorage.getItem('jct_completion__course-xyz')).toBe(
      JSON.stringify({ pinHash: 'hash-abc', salt: 'salt-def' })
    );
  });

  it('importAllData rejects backups from a newer schema version without modifying storage', () => {
    localStorage.setItem('jct_watched__safe_course', JSON.stringify(['safe_lecture']));

    const newerBackup = {
      appName: 'Core Java + AI Lecture Tracker',
      backupVersion: 1,
      schemaVersion: 999,
      data: {
        'jct_course_registry_v1': JSON.stringify(['future-course']),
      },
    };

    expect(() => importAllData(newerBackup)).toThrow(
      /Backup is from a newer schema version \(999\) than supported by this app version \(1\)/
    );

    // Existing storage must not be wiped or mutated
    expect(localStorage.getItem('jct_watched__safe_course')).toBe(JSON.stringify(['safe_lecture']));
    expect(localStorage.getItem('jct_course_registry_v1')).toBeNull();
  });

  it('importAllData rejects malformed or tampered backup payloads without wiping existing storage', () => {
    localStorage.setItem('jct_watched__existing', JSON.stringify(['keep_this']));

    // Malformed non-string value in data map
    const invalidValueBackup = {
      appName: 'Core Java + AI Lecture Tracker',
      backupVersion: 1,
      schemaVersion: 1,
      data: {
        'jct_course_registry_v1': 12345, // Number instead of string
      },
    };

    expect(() => importAllData(invalidValueBackup)).toThrow(/must be a string/);
    expect(localStorage.getItem('jct_watched__existing')).toBe(JSON.stringify(['keep_this']));

    // Malformed key in data map
    const invalidKeyBackup = {
      appName: 'Core Java + AI Lecture Tracker',
      backupVersion: 1,
      schemaVersion: 1,
      data: {
        'non_jct_key': 'some_value',
      },
    };

    expect(() => importAllData(invalidKeyBackup)).toThrow(/All keys must begin with "jct_"/);
    expect(localStorage.getItem('jct_watched__existing')).toBe(JSON.stringify(['keep_this']));
  });

  it('importAllData migrates older backups (v0 without schemaVersion) before applying them', () => {
    const v0LegacyBackup = {
      appName: 'Core Java + AI Lecture Tracker',
      backupVersion: 1,
      // No schemaVersion field (legacy v0)
      data: {
        'jct_course_registry_v1': JSON.stringify(['legacy-course']),
        'jct_watched__legacy-course': JSON.stringify(['l1', 'l2']),
      },
    };

    importAllData(v0LegacyBackup);

    expect(localStorage.getItem('jct_course_registry_v1')).toBe(JSON.stringify(['legacy-course']));
    expect(localStorage.getItem('jct_watched__legacy-course')).toBe(JSON.stringify(['l1', 'l2']));
    expect(localStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION)).toBe('1');
  });
});
