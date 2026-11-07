/**
 * Storage Schema Migration Runner & Rollback Engine
 *
 * Coordinates execution of ordered schema migrations at application startup,
 * pre-migration safety snapshots, transactional rollbacks upon failure,
 * and pure in-memory migrations for backup payloads.
 */

import {
  STORAGE_KEYS,
  STORAGE_PREFIX,
  isSensitiveKey,
} from '../keys.js';
import {
  CURRENT_SCHEMA_VERSION,
  MIGRATIONS,
} from './migrationRegistry.js';

/**
 * Normalizes different storage targets (window.localStorage, StorageDriver, or custom test mocks)
 * into a uniform synchronous interface.
 *
 * @param {object} [storage]
 * @returns {{ getItem: Function, setItem: Function, removeItem: Function, keys: Function, raw: object }}
 */
export function createStorageAdapter(storage) {
  const target = storage || (typeof window !== 'undefined' ? window.localStorage : globalThis.localStorage);
  if (!target) {
    throw new Error('No storage target available for migration execution.');
  }

  return {
    getItem(key) {
      if (typeof target.getItem === 'function') return target.getItem(key);
      if (typeof target.get === 'function') {
        const val = target.get(key);
        return typeof val === 'string' ? val : JSON.stringify(val);
      }
      return null;
    },
    setItem(key, value) {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      if (typeof target.setItem === 'function') {
        return target.setItem(key, stringValue);
      }
      if (typeof target.set === 'function') {
        return target.set(key, stringValue);
      }
      throw new Error('Storage target does not support setItem or set.');
    },
    removeItem(key) {
      if (typeof target.removeItem === 'function') return target.removeItem(key);
      if (typeof target.remove === 'function') return target.remove(key);
      return false;
    },
    keys() {
      if (typeof target.keys === 'function') {
        const result = target.keys();
        return Array.isArray(result) ? result : Array.from(result);
      }
      if (typeof target.length === 'number') {
        const result = [];
        for (let i = 0; i < target.length; i++) {
          const k = target.key(i);
          if (k) result.push(k);
        }
        return result;
      }
      return [];
    },
    raw: target,
  };
}

/**
 * Reads the current schema version from storage.
 * Unversioned legacy storage defaults to version 0.
 *
 * @param {object} adapter
 * @returns {number}
 */
export function getStoredSchemaVersion(adapter) {
  try {
    const raw = adapter.getItem(STORAGE_KEYS.SCHEMA_VERSION);
    if (raw === null || raw === undefined) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

/**
 * Persists the updated schema version into storage.
 *
 * @param {object} adapter
 * @param {number} version
 */
export function setStoredSchemaVersion(adapter, version) {
  adapter.setItem(STORAGE_KEYS.SCHEMA_VERSION, String(version));
}

/**
 * Creates a pre-migration safety snapshot of all non-sensitive app storage keys.
 * Rolling: only the latest snapshot is stored under STORAGE_KEYS.MIGRATION_BACKUP.
 *
 * Security Guarantee:
 * Sensitive keys (API keys, cryptographic hashes) are strictly excluded.
 *
 * @param {object} adapter
 * @param {number} fromVersion
 * @returns {{ ok: boolean, snapshot?: object, error?: Error }}
 */
export function createMigrationSnapshot(adapter, fromVersion) {
  try {
    const data = {};
    const allKeys = adapter.keys();

    for (const key of allKeys) {
      if (
        key &&
        key.startsWith(STORAGE_PREFIX) &&
        key !== STORAGE_KEYS.MIGRATION_BACKUP &&
        !isSensitiveKey(key)
      ) {
        const raw = adapter.getItem(key);
        if (raw !== null && raw !== undefined) {
          data[key] = raw;
        }
      }
    }

    const snapshot = {
      timestamp: new Date().toISOString(),
      fromVersion,
      data,
    };

    adapter.setItem(STORAGE_KEYS.MIGRATION_BACKUP, JSON.stringify(snapshot));
    return { ok: true, snapshot };
  } catch (err) {
    console.warn(
      '[MigrationRunner] Failed to persist pre-migration snapshot (quota or storage unavailable):',
      err
    );
    return { ok: false, error: err };
  }
}

/**
 * Restores a pre-migration safety snapshot upon migration or validation failure.
 * Leaves the schema version at fromVersion and dispatches a non-blocking notification.
 *
 * @param {object} adapter
 * @param {object} snapshot
 * @param {Error} error
 */
export function restoreMigrationSnapshot(adapter, snapshot, error) {
  console.warn(
    `[MigrationRunner] Rolling back storage changes to version ${snapshot.fromVersion}:`,
    error
  );

  try {
    // 1. Remove all non-sensitive keys currently in storage that weren't in snapshot
    const allKeys = adapter.keys();
    for (const key of allKeys) {
      if (
        key &&
        key.startsWith(STORAGE_PREFIX) &&
        key !== STORAGE_KEYS.MIGRATION_BACKUP &&
        !isSensitiveKey(key) &&
        !(key in snapshot.data)
      ) {
        adapter.removeItem(key);
      }
    }

    // 2. Restore all snapshotted keys
    for (const [key, value] of Object.entries(snapshot.data)) {
      adapter.setItem(key, value);
    }

    // 3. Restore schema version to snapshot.fromVersion
    if (snapshot.fromVersion === 0) {
      adapter.removeItem(STORAGE_KEYS.SCHEMA_VERSION);
    } else {
      setStoredSchemaVersion(adapter, snapshot.fromVersion);
    }
  } catch (restoreErr) {
    console.error('[MigrationRunner] Critical error during rollback restore:', restoreErr);
  }

  // 4. Dispatch non-blocking error notice to the UI
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(
        new CustomEvent('jct:migration_error', {
          detail: {
            fromVersion: snapshot.fromVersion,
            error: error?.message || String(error),
          },
        })
      );
    } catch {
      // Ignore event dispatch failure in non-DOM environments
    }
  }
}

/**
 * Validates the output of a migration function.
 *
 * @param {*} output
 * @param {number} fromVersion
 * @param {number} toVersion
 */
export function validateMigrationOutput(output, fromVersion, toVersion) {
  if (!output || typeof output !== 'object' || Array.isArray(output)) {
    throw new Error(
      `Migration ${fromVersion}->${toVersion} must return a key-value data map object, got ${typeof output}.`
    );
  }

  for (const [key, value] of Object.entries(output)) {
    if (isSensitiveKey(key)) {
      throw new Error(
        `Security Violation: Migration ${fromVersion}->${toVersion} attempted to modify or create sensitive key "${key}". Migrations are strictly forbidden from touching sensitive keys.`
      );
    }
    if (!key.startsWith(STORAGE_PREFIX)) {
      throw new Error(
        `Invalid key "${key}" in migration ${fromVersion}->${toVersion}: all keys must begin with "${STORAGE_PREFIX}".`
      );
    }
    if (typeof value !== 'string') {
      throw new Error(
        `Invalid value for key "${key}" in migration ${fromVersion}->${toVersion}: value must be a serialized string, got ${typeof value}.`
      );
    }
  }
}

/**
 * Runs all pending migrations in order at application startup.
 *
 * Execution flow:
 * 1. Checks current stored schema version.
 * 2. If up-to-date, completes immediately.
 * 3. Snapshots all non-sensitive keys into STORAGE_KEYS.MIGRATION_BACKUP.
 * 4. If snapshot write fails, skips migrations and stays on current version.
 * 5. Runs migrations sequentially. If any throws or fails validation, rolls back cleanly.
 *
 * @param {object} [storage] Storage driver or window.localStorage
 * @returns {{ applied: number, currentVersion: number, skipped?: boolean, rolledBack?: boolean, error?: Error }}
 */
export function runPendingMigrations(storage) {
  const adapter = createStorageAdapter(storage);
  const currentVersion = getStoredSchemaVersion(adapter);

  if (currentVersion >= CURRENT_SCHEMA_VERSION) {
    return { applied: 0, currentVersion, skipped: false };
  }

  const pending = MIGRATIONS.filter(
    (m) => m.fromVersion >= currentVersion && m.toVersion <= CURRENT_SCHEMA_VERSION
  ).sort((a, b) => a.fromVersion - b.fromVersion);

  if (pending.length === 0) {
    // If no explicit migrations exist up to current, stamp to current version
    setStoredSchemaVersion(adapter, CURRENT_SCHEMA_VERSION);
    return { applied: 0, currentVersion: CURRENT_SCHEMA_VERSION, skipped: false };
  }

  // Safety snapshot before running the first pending migration
  const snapshotResult = createMigrationSnapshot(adapter, currentVersion);
  if (!snapshotResult.ok) {
    console.warn(
      '[MigrationRunner] Skipping storage migrations: pre-migration snapshot could not be saved. App remains on version ' +
        currentVersion +
        '.'
    );
    return {
      applied: 0,
      currentVersion,
      skipped: true,
      reason: 'snapshot_failed',
      error: snapshotResult.error,
    };
  }

  // Load non-sensitive working dataset
  let workingDataMap = {};
  for (const [key, value] of Object.entries(snapshotResult.snapshot.data)) {
    workingDataMap[key] = value;
  }

  let appliedCount = 0;

  for (const migration of pending) {
    try {
      // Pure up() execution on a clone of the working dataset
      const nextDataMap = migration.up({ ...workingDataMap });
      validateMigrationOutput(nextDataMap, migration.fromVersion, migration.toVersion);

      // Apply mutations: remove deleted keys
      for (const k of Object.keys(workingDataMap)) {
        if (!(k in nextDataMap)) {
          adapter.removeItem(k);
        }
      }

      // Apply mutations: set updated/new keys
      for (const [k, v] of Object.entries(nextDataMap)) {
        adapter.setItem(k, v);
      }

      // Update schema version stamp
      setStoredSchemaVersion(adapter, migration.toVersion);
      workingDataMap = nextDataMap;
      appliedCount++;
    } catch (err) {
      console.error(
        `[MigrationRunner] Migration ${migration.fromVersion}->${migration.toVersion} failed:`,
        err
      );
      restoreMigrationSnapshot(adapter, snapshotResult.snapshot, err);
      return {
        applied: appliedCount,
        currentVersion,
        rolledBack: true,
        error: err,
      };
    }
  }

  return {
    applied: appliedCount,
    currentVersion: CURRENT_SCHEMA_VERSION,
    success: true,
  };
}

/**
 * Pure in-memory migration runner for backup payloads.
 * Runs pending migrations on a backup payload's data map without touching physical storage.
 *
 * @param {Record<string, string>} dataPayload
 * @param {number} fromVersion
 * @param {number} [targetVersion=CURRENT_SCHEMA_VERSION]
 * @returns {Record<string, string>}
 */
export function migrateDataPayload(dataPayload, fromVersion, targetVersion = CURRENT_SCHEMA_VERSION) {
  if (!dataPayload || typeof dataPayload !== 'object') {
    throw new Error('Data payload must be an object.');
  }

  if (fromVersion >= targetVersion) {
    return { ...dataPayload };
  }

  const pending = MIGRATIONS.filter(
    (m) => m.fromVersion >= fromVersion && m.toVersion <= targetVersion
  ).sort((a, b) => a.fromVersion - b.fromVersion);

  let currentMap = { ...dataPayload };

  for (const migration of pending) {
    // Strip sensitive keys from input if any accidentally leaked into the map
    const sanitizedInput = {};
    for (const [k, v] of Object.entries(currentMap)) {
      if (!isSensitiveKey(k)) {
        sanitizedInput[k] = v;
      }
    }

    const nextMap = migration.up(sanitizedInput);
    validateMigrationOutput(nextMap, migration.fromVersion, migration.toVersion);
    currentMap = nextMap;
  }

  return currentMap;
}

