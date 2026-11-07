import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  STORAGE_KEYS,
  COURSE_KEY_PREFIXES,
  isSensitiveKey,
} from '../keys.js';
import {
  CURRENT_SCHEMA_VERSION,
  MIGRATIONS,
  validateMigrationList,
} from './migrationRegistry.js';
import {
  createStorageAdapter,
  getStoredSchemaVersion,
  setStoredSchemaVersion,
  createMigrationSnapshot,
  restoreMigrationSnapshot,
  validateMigrationOutput,
  runPendingMigrations,
  migrateDataPayload,
} from './migrationRunner.js';

describe('Storage Migration Engine & Runner', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Migration Registry & Ordering Validation', () => {
    it('validates contiguous ordering and structure of migration definitions', () => {
      expect(validateMigrationList(MIGRATIONS)).toBe(true);
      expect(CURRENT_SCHEMA_VERSION).toBe(1);
      expect(MIGRATIONS[0].fromVersion).toBe(0);
      expect(MIGRATIONS[0].toVersion).toBe(1);
    });

    it('rejects non-contiguous version sequences or gaps', () => {
      const gapped = [
        { fromVersion: 0, toVersion: 1, description: 'v0->v1', up: (d) => d },
        { fromVersion: 2, toVersion: 3, description: 'v2->v3', up: (d) => d },
      ];
      expect(() => validateMigrationList(gapped)).toThrow(/gap detected/i);
    });

    it('rejects migrations with multi-step or descending jumps', () => {
      const jumping = [
        { fromVersion: 0, toVersion: 2, description: 'v0->v2', up: (d) => d },
      ];
      expect(() => validateMigrationList(jumping)).toThrow(/advance exactly 1 version/i);
    });

    it('rejects migrations without a pure up function or description', () => {
      const missingUp = [{ fromVersion: 0, toVersion: 1, description: 'missing up' }];
      expect(() => validateMigrationList(missingUp)).toThrow(/missing a pure up/i);

      const missingDesc = [{ fromVersion: 0, toVersion: 1, up: (d) => d }];
      expect(() => validateMigrationList(missingDesc)).toThrow(/missing a description/i);
    });
  });

  describe('Pre-Migration Snapshot Creation', () => {
    it('creates rolling pre-migration snapshot containing all non-sensitive app keys', () => {
      localStorage.setItem('jct_course_registry_v1', JSON.stringify(['course-1']));
      localStorage.setItem('jct_watched__course-1', JSON.stringify(['l1', 'l2']));
      localStorage.setItem('unrelated_key', 'should_not_be_snapshotted');

      const adapter = createStorageAdapter(localStorage);
      const result = createMigrationSnapshot(adapter, 0);

      expect(result.ok).toBe(true);
      expect(result.snapshot).toBeDefined();
      expect(result.snapshot.fromVersion).toBe(0);
      expect(result.snapshot.data['jct_course_registry_v1']).toBe(JSON.stringify(['course-1']));
      expect(result.snapshot.data['jct_watched__course-1']).toBe(JSON.stringify(['l1', 'l2']));
      expect(result.snapshot.data['unrelated_key']).toBeUndefined();

      // Check persisted snapshot
      const rawStored = localStorage.getItem(STORAGE_KEYS.MIGRATION_BACKUP);
      expect(rawStored).toBeTruthy();
      const stored = JSON.parse(rawStored);
      expect(stored.fromVersion).toBe(0);
      expect(stored.data['jct_course_registry_v1']).toBeTruthy();
    });

    it('strictly excludes sensitive keys from safety snapshots', () => {
      const mockOpenAiKey = ['sk', '-proj-snapshot-test-1234'].join('');
      const mockTutorKey = ['sk', '-proj-tutor-test-5678'].join('');
      localStorage.setItem('jct_course_registry_v1', JSON.stringify(['c1']));
      localStorage.setItem('jct_openai_api_key_v1', mockOpenAiKey);
      localStorage.setItem('jct_ai_api_keys_v1', JSON.stringify([{ key: mockTutorKey }]));
      localStorage.setItem('jct_completion__c1', JSON.stringify({ pinHash: 'hash123', salt: 'salt456' }));

      const adapter = createStorageAdapter(localStorage);
      const result = createMigrationSnapshot(adapter, 0);

      expect(result.ok).toBe(true);
      expect(result.snapshot.data['jct_course_registry_v1']).toBeDefined();
      expect(result.snapshot.data['jct_openai_api_key_v1']).toBeUndefined();
      expect(result.snapshot.data['jct_ai_api_keys_v1']).toBeUndefined();
      expect(result.snapshot.data['jct_completion__c1']).toBeUndefined();
    });
  });

  describe('Skip Migration when Snapshot Fails', () => {
    it('skips migrations, logs warning, and leaves data and version unchanged when snapshot cannot be saved', () => {
      localStorage.setItem('jct_course_registry_v1', JSON.stringify(['course-1']));
      localStorage.setItem('jct_watched__course-1', JSON.stringify(['l1']));

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Simulate quota error specifically on MIGRATION_BACKUP key
      const originalSetItem = Storage.prototype.setItem;
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (k, v) {
        if (k === STORAGE_KEYS.MIGRATION_BACKUP) {
          const quotaErr = new Error('QuotaExceededError: Storage quota reached');
          quotaErr.name = 'QuotaExceededError';
          throw quotaErr;
        }
        return originalSetItem.call(this, k, v);
      });

      const res = runPendingMigrations(localStorage);

      expect(res.skipped).toBe(true);
      expect(res.reason).toBe('snapshot_failed');
      expect(res.applied).toBe(0);
      expect(getStoredSchemaVersion(createStorageAdapter(localStorage))).toBe(0);
      expect(localStorage.getItem('jct_course_registry_v1')).toBe(JSON.stringify(['course-1']));
      expect(localStorage.getItem('jct_watched__course-1')).toBe(JSON.stringify(['l1']));
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('Rollback Engine', () => {
    it('rolls back all storage mutations, preserves fromVersion, and dispatches notice when a migration throws', () => {
      localStorage.setItem('jct_course_registry_v1', JSON.stringify(['course-alpha']));
      localStorage.setItem('jct_watched__course-alpha', JSON.stringify(['l1']));

      // Custom test mock storage adapter with a failing migration
      const errorEventSpy = vi.fn();
      window.addEventListener('jct:migration_error', errorEventSpy);

      const faultyMigration = {
        fromVersion: 0,
        toVersion: 1,
        description: 'Faulty migration',
        up: () => {
          throw new Error('Simulated database corruption during migration');
        },
      };

      const adapter = createStorageAdapter(localStorage);
      const snapshotResult = createMigrationSnapshot(adapter, 0);

      try {
        faultyMigration.up();
      } catch (err) {
        restoreMigrationSnapshot(adapter, snapshotResult.snapshot, err);
      }

      // Assert rollback
      expect(getStoredSchemaVersion(adapter)).toBe(0);
      expect(localStorage.getItem('jct_course_registry_v1')).toBe(JSON.stringify(['course-alpha']));
      expect(localStorage.getItem('jct_watched__course-alpha')).toBe(JSON.stringify(['l1']));
      expect(errorEventSpy).toHaveBeenCalledTimes(1);
      expect(errorEventSpy.mock.calls[0][0].detail.error).toContain('Simulated database corruption');

      window.removeEventListener('jct:migration_error', errorEventSpy);
    });

    it('rolls back when a migration returns invalid output (non-object or non-string values)', () => {
      expect(() => validateMigrationOutput(null, 0, 1)).toThrow(/must return a key-value/);
      expect(() => validateMigrationOutput(['array_not_allowed'], 0, 1)).toThrow(/must return a key-value/);
      expect(() => validateMigrationOutput({ 'jct_foo': 12345 }, 0, 1)).toThrow(/must be a serialized string/);
      expect(() => validateMigrationOutput({ 'non_jct_key': 'valid_str' }, 0, 1)).toThrow(/must begin with/);
    });
  });

  describe('Sensitive Key Protection Gate', () => {
    it('strictly prohibits any migration from creating or modifying sensitive keys', () => {
      const mockKey = ['sk', '-proj-illegal-key'].join('');
      const illegalOutput = {
        'jct_course_registry_v1': JSON.stringify(['course-1']),
        'jct_openai_api_key_v1': mockKey,
      };

      expect(() => validateMigrationOutput(illegalOutput, 0, 1)).toThrow(
        /Security Violation: Migration 0->1 attempted to modify or create sensitive key "jct_openai_api_key_v1"/
      );
    });

    it('prohibits migrations from touching completion PIN hash keys', () => {
      const illegalOutput = {
        'jct_completion__course-1': JSON.stringify({ pinHash: 'bad_hash' }),
      };

      expect(() => validateMigrationOutput(illegalOutput, 0, 1)).toThrow(
        /Security Violation: Migration 0->1 attempted to modify or create sensitive key "jct_completion__course-1"/
      );
    });
  });

  describe('Pure In-Memory Payload Migration (migrateDataPayload)', () => {
    it('passes payload through migrations in memory without touching physical storage', () => {
      const v0Backup = {
        'jct_course_registry_v1': JSON.stringify(['course-x']),
        'jct_watched__course-x': JSON.stringify(['l1']),
      };

      const migrated = migrateDataPayload(v0Backup, 0, 1);
      expect(migrated).toEqual(v0Backup);
      // localStorage remains untouched
      expect(localStorage.length).toBe(0);
    });

    it('returns a clone when fromVersion >= targetVersion', () => {
      const data = { 'jct_foo': 'bar' };
      const res = migrateDataPayload(data, 1, 1);
      expect(res).toEqual(data);
      expect(res).not.toBe(data);
    });
  });

  describe('Baseline v0 to v1 Migration & Real Data Shapes Fixture', () => {
    it('stamps schema version 1 on unversioned storage with zero change to existing data shapes', () => {
      // Setup comprehensive fixture of all data shapes present in production
      const fixtureData = {
        'jct_course_registry_v1': JSON.stringify({
          courseIds: ['core-java', 'custom-1'],
          activeCourseId: 'core-java',
          customCourses: { 'custom-1': { id: 'custom-1', title: 'Custom 1', sections: [] } },
        }),
        'jct_watched__core-java': JSON.stringify(['l1', 'l2', 'l3']),
        'jct_today_plan__core-java': JSON.stringify(['l4', 'l5']),
        'jct_settings__core-java': JSON.stringify({ dailyTargetHours: 2, streakMode: 'regular', autoPlan: true }),
        'jct_history__core-java': JSON.stringify({ '2026-11-07': { watchedCount: 2, watchedSec: 3600, isPractice: false } }),
        'jct_start_date__core-java': '2026-11-01',
        'jct_start_date_manual__core-java': 'false',
        'jct_badges__core-java': JSON.stringify({ 'first-step': { unlockedAt: '2026-11-01T10:00:00.000Z' } }),
        'jct_streak_freezes__core-java': JSON.stringify({ availableFreezes: 2, usedFreezes: [], freezeHistory: [] }),
        'jct_tracking__core-java_v2': JSON.stringify({ version: 'v2', dailyLog: {}, velocityEWMA: 1.25 }),
        'jct_notifications_v1': JSON.stringify([{ id: 'n1', title: 'Test Alert', type: 'reminder' }]),
        'jct_notification_settings_v1': JSON.stringify({ enabled: true, reminderTime: '19:00' }),
        'jct_ai_fab_hidden': 'false',
      };

      // Populate storage
      Object.entries(fixtureData).forEach(([k, v]) => {
        localStorage.setItem(k, v);
      });

      // Verify unversioned state before migration
      const adapter = createStorageAdapter(localStorage);
      expect(getStoredSchemaVersion(adapter)).toBe(0);

      // Run pending migrations
      const result = runPendingMigrations(localStorage);
      expect(result.success).toBe(true);
      expect(result.applied).toBe(1);
      expect(result.currentVersion).toBe(1);

      // Verify schema version is now stamped
      expect(getStoredSchemaVersion(adapter)).toBe(1);
      expect(localStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION)).toBe('1');

      // Assert that EVERY single key and value in the fixture is 100% untouched
      Object.entries(fixtureData).forEach(([k, v]) => {
        expect(localStorage.getItem(k), `Data shape mutated for key: ${k}`).toBe(v);
      });

      // Running a second time is a no-op
      const reRun = runPendingMigrations(localStorage);
      expect(reRun.applied).toBe(0);
      expect(reRun.currentVersion).toBe(1);
    });
  });
});

