import { StorageDriver } from './StorageDriver.js';

/**
 * In-Memory Fallback Storage Driver
 *
 * Implements the synchronous StorageDriver interface using an in-memory Map.
 * Values are stored as serialized JSON strings to ensure immutability and exact parity
 * with browser localStorage semantics (preventing shared reference mutations).
 *
 * Used as an automatic fallback when localStorage is unavailable (e.g. private browsing,
 * disabled cookies, security sandboxes, or storage quota exhaustion).
 */
export class MemoryStorageDriver extends StorageDriver {
  constructor() {
    super();
    this.name = 'memory';
    /** @type {Map<string, string>} */
    this._store = new Map();
    this._simulateQuota = false;
  }

  isAvailable() {
    return true;
  }

  get(key, defaultValue = null) {
    if (!this._store.has(key)) return defaultValue;
    try {
      const raw = this._store.get(key);
      if (raw === undefined || raw === null) return defaultValue;
      return JSON.parse(raw);
    } catch {
      return defaultValue;
    }
  }

  set(key, value) {
    if (this._simulateQuota) {
      const err = new Error('Simulated QuotaExceededError in MemoryStorageDriver');
      err.name = 'QuotaExceededError';
      err.code = 22;
      throw err;
    }
    try {
      const serialized = JSON.stringify(value);
      this._store.set(key, serialized);
      return true;
    } catch {
      return false;
    }
  }

  remove(key) {
    return this._store.delete(key);
  }

  keys() {
    return Array.from(this._store.keys());
  }

  clear() {
    this._store.clear();
    return true;
  }

  /**
   * Helper for testing quota exhaustion behavior
   * @param {boolean} flag
   */
  simulateQuota(flag = true) {
    this._simulateQuota = flag;
  }
}

export default MemoryStorageDriver;
