/**
 * Migration Registry & Schema Version Configuration
 *
 * Single source of truth for the active schema version and the ordered
 * list of storage migrations.
 */

/**
 * Current application storage schema version.
 * Incremented whenever a schema migration is introduced.
 */
export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Validates the contiguous ordering and structure of a migrations list.
 *
 * Enforces:
 * 1. Monotonically increasing version steps (v0 -> v1, v1 -> v2, etc.)
 * 2. No version gaps or out-of-order definitions
 * 3. Existence of a pure up() function and description
 *
 * @param {Array<{ fromVersion: number, toVersion: number, description: string, up: Function }>} migrations
 * @returns {boolean}
 */
export function validateMigrationList(migrations) {
  if (!Array.isArray(migrations)) {
    throw new Error('Migrations must be an array');
  }

  for (let i = 0; i < migrations.length; i++) {
    const m = migrations[i];
    if (typeof m.fromVersion !== 'number' || typeof m.toVersion !== 'number') {
      throw new Error(`Migration at index ${i} has invalid version numbers`);
    }
    if (m.toVersion !== m.fromVersion + 1) {
      throw new Error(`Migration ${m.fromVersion}->${m.toVersion} must advance exactly 1 version`);
    }
    if (typeof m.up !== 'function') {
      throw new Error(`Migration ${m.fromVersion}->${m.toVersion} is missing a pure up() function`);
    }
    if (typeof m.description !== 'string' || !m.description.trim()) {
      throw new Error(`Migration ${m.fromVersion}->${m.toVersion} is missing a description`);
    }
    if (i > 0 && m.fromVersion !== migrations[i - 1].toVersion) {
      throw new Error(
        `Migration version gap detected between ${migrations[i - 1].toVersion} and ${m.fromVersion}`
      );
    }
  }

  return true;
}

/**
 * Ordered list of storage schema migrations.
 *
 * Pure function contract:
 * Each `up(dataMap)` receives a shallow clone of the key-value data map (all non-sensitive `jct_` keys)
 * and must return a new or modified key-value data map.
 * Migrations MUST NEVER modify or return sensitive keys (e.g. API keys, completion PIN hashes).
 */
export const MIGRATIONS = Object.freeze([
  {
    fromVersion: 0,
    toVersion: 1,
    description: 'Baseline schema version stamp (v0 to v1)',
    up: (dataMap) => {
      // v0 is legacy unversioned state.
      // v1 introduces the schema version key without altering any user data shapes or keys.
      return { ...dataMap };
    },
  },
]);

// Validate registry configuration
validateMigrationList(MIGRATIONS);

