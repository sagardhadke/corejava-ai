import { StorageDriver } from './StorageDriver.js';

/**
 * Browser LocalStorage Driver
 *
 * Implements the synchronous StorageDriver contract backed by window.localStorage.
 * Includes availability probing, serialization guards, quota error detection,
 * and global quota notification events.
 */
export class LocalStorageDriver extends StorageDriver {
  constructor() {
    super();
    this.name = 'localStorage';
  }

  /**
   * Probes window.localStorage availability and writability.
   * Handles Safari private browsing and disabled cookie/storage environments.
   * @returns {boolean}
   */
  isAvailable() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  get(key, defaultValue = null) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return defaultValue;
      const raw = window.localStorage.getItem(key);
      if (raw === null || raw === undefined) return defaultValue;
      return JSON.parse(raw);
    } catch (err) {
      console.warn(`[LocalStorageDriver] Failed to read key "${key}":`, err);
      return defaultValue;
    }
  }

  set(key, value) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        const unavailErr = new Error('localStorage is unavailable');
        unavailErr.name = 'StorageUnavailableError';
        throw unavailErr;
      }
      const serialized = JSON.stringify(value);
      window.localStorage.setItem(key, serialized);
      return true;
    } catch (err) {
      if (this.isQuotaExceeded(err)) {
        console.error(`[LocalStorageDriver] Storage quota exceeded while writing "${key}".`, err);
        this.notifyQuotaExceeded();
      } else {
        console.error(`[LocalStorageDriver] Error writing "${key}":`, err);
      }
      throw err;
    }
  }

  remove(key) {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      window.localStorage.removeItem(key);
      return true;
    } catch (err) {
      console.error(`[LocalStorageDriver] Error removing key "${key}":`, err);
      return false;
    }
  }

  keys() {
    try {
      if (!this.isAvailable()) return [];
      const result = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k) result.push(k);
      }
      return result;
    } catch {
      return [];
    }
  }

  clear() {
    try {
      if (!this.isAvailable()) return false;
      window.localStorage.clear();
      return true;
    } catch (err) {
      console.error('[LocalStorageDriver] Error clearing storage:', err);
      return false;
    }
  }

  /**
   * Computes approximate UTF-16 byte usage of all stored keys and values.
   * @returns {number}
   */
  getUsageBytes() {
    try {
      if (!this.isAvailable()) return 0;
      let total = 0;
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        const v = window.localStorage.getItem(k);
        total += (k ? k.length : 0) + (v ? v.length : 0);
      }
      return total * 2; // UTF-16 characters = 2 bytes each
    } catch {
      return 0;
    }
  }

  isQuotaExceeded(err) {
    return (
      err &&
      (err.code === 22 ||
        err.code === 1014 ||
        err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    );
  }

  notifyQuotaExceeded() {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('jct:storage_quota_exceeded'));
    }
  }
}

export default LocalStorageDriver;
