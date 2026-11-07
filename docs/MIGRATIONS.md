# Storage Schema Migrations Guide

This document describes the schema versioning system, migration engine, and guidelines for adding future storage migrations in Java Course Tracker.

---

## 1. Architecture Overview

Java Course Tracker uses a lightweight, client-side migration engine to evolve data models safely without data loss or downtime.

- **Current Schema Version**: Defined in `src/services/storage/migrations/migrationRegistry.js` as `CURRENT_SCHEMA_VERSION`.
- **Global Version Key**: Stored under `jct_schema_version` (registered in `src/services/storage/keys.js`). Unversioned legacy installs are treated as version `0`.
- **Execution Hook**: `runPendingMigrations()` executes synchronously at application startup in `src/main.jsx` before any React components or hooks mount.
- **Backup Parity**: The pure migration pipeline (`migrateDataPayload`) is also run automatically during backup restores (`importAllData`) so that backups from older versions are upgraded cleanly before being restored.

---

## 2. Core Principles & Safety Gates

### Pure Function Contract
Every migration step implements a pure `up(dataMap)` function:
- Receives a shallow clone of the working key-value map: `dataMap: Record<string, string>`.
- Returns a new or modified key-value map.
- Operates purely on data; never accesses `window`, `localStorage`, or external side effects directly.

### Strict Sensitive Key Isolation
Migrations and safety snapshots **MUST NEVER** access, modify, or output sensitive keys:
- Sensitive keys include all API provider keys (`jct_openai_api_key_v1`, `jct_ai_api_keys_v1`, etc.) and cryptographic PIN completion hashes (`jct_completion__*`).
- If a migration returns or modifies any sensitive key identified by `isSensitiveKey(key)`, the validation gate throws an error, aborts execution, and triggers an immediate rollback.

### Pre-Migration Safety Snapshot
Before running pending migrations:
1. All non-sensitive `jct_` keys are snapshotted into `jct_migration_backup_latest`.
2. If the snapshot write fails (due to storage quota exhaustion or private browsing restrictions), migration execution is skipped, keeping the application safely on its current version.
3. Migrations will **never** run without a verified snapshot.

### Transactional Rollback
If any migration step throws an unhandled error or outputs invalid data:
1. The pre-migration snapshot is immediately restored to storage.
2. The schema version remains unchanged at the initial version.
3. A non-blocking `jct:migration_error` event is dispatched to surface an error notification without crashing the application.
4. Data is never left in a half-migrated state.

---

## 3. Step-by-Step: Adding a New Migration

Follow these steps whenever a schema or storage key format changes:

### Step 1: Increment Schema Version
In `src/services/storage/migrations/migrationRegistry.js`, increment `CURRENT_SCHEMA_VERSION`:
```javascript
export const CURRENT_SCHEMA_VERSION = 2; // e.g. from 1 to 2
```

### Step 2: Register New Storage Keys (if applicable)
If the migration introduces new static keys or prefixes, register them in `src/services/storage/keys.js`:
- Add key to `STORAGE_KEYS`
- Add entry to `STORAGE_KEY_REGISTRY` with `ownerFeature`, `dataShape`, `isSensitive`, and `isInBackup`.

### Step 3: Append Migration Definition
Append the new migration to `MIGRATIONS` in `src/services/storage/migrations/migrationRegistry.js`:
```javascript
export const MIGRATIONS = Object.freeze([
  {
    fromVersion: 0,
    toVersion: 1,
    description: 'Baseline schema version stamp (v0 to v1)',
    up: (dataMap) => ({ ...dataMap }),
  },
  {
    fromVersion: 1,
    toVersion: 2,
    description: 'Describe what this migration transforms',
    up: (dataMap) => {
      const next = { ...dataMap };
      // Example: transform a stored key format
      if (next['jct_example_old_key']) {
        next['jct_example_new_key'] = next['jct_example_old_key'];
        delete next['jct_example_old_key'];
      }
      return next;
    },
  },
]);
```

### Step 4: Add Unit & Integration Tests
In `src/services/storage/migrations/migrationRunner.test.js`:
- Test that `fromVersion -> toVersion` transforms data as expected.
- Test that missing or malformed inputs are handled gracefully.
- Verify that older backup payloads restore correctly through `importAllData()`.

### Step 5: Verification
Run the complete quality gate before submitting:
```bash
npm test
npm run build
npm audit --audit-level=high
node .github/scripts/forbidden-files-check.js --ci
```

