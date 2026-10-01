/**
 * Enterprise Storage Service & Repository Abstraction Layer
 *
 * Implements a pluggable Repository pattern decoupling client state
 * from physical storage media. Currently operates on a hardened LocalStorageAdapter
 * with quota monitoring, error recovery, and serialization guards.
 *
 * Prepared for seamless drop-in cloud backend / remote REST/GraphQL synchronization.
 */

class LocalStorageAdapter {
  constructor() {
    this.name = 'localStorage';
  }

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

  getItem(key, defaultValue = null) {
    try {
      if (!this.isAvailable()) return defaultValue;
      const raw = window.localStorage.getItem(key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw);
    } catch (err) {
      console.warn(`[StorageService] Failed to read key "${key}":`, err);
      return defaultValue;
    }
  }

  setItem(key, value) {
    try {
      if (!this.isAvailable()) return false;
      const serialized = JSON.stringify(value);
      window.localStorage.setItem(key, serialized);
      return true;
    } catch (err) {
      if (this.isQuotaExceeded(err)) {
        console.error(`[StorageService] Storage quota exceeded while writing "${key}".`, err);
        this.notifyQuotaExceeded();
      } else {
        console.error(`[StorageService] Error writing "${key}":`, err);
      }
      return false;
    }
  }

  removeItem(key) {
    try {
      if (!this.isAvailable()) return false;
      window.localStorage.removeItem(key);
      return true;
    } catch (err) {
      console.error(`[StorageService] Error removing key "${key}":`, err);
      return false;
    }
  }

  clear() {
    try {
      if (!this.isAvailable()) return false;
      window.localStorage.clear();
      return true;
    } catch (err) {
      console.error('[StorageService] Error clearing storage:', err);
      return false;
    }
  }

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

/**
 * Contract for future Cloud / Backend Remote Adapter
 */
export class RemoteApiAdapter {
  constructor(apiBaseUrl = '/api/v1', authToken = null) {
    this.name = 'remoteApi';
    this.baseUrl = apiBaseUrl;
    this.token = authToken;
    this.localFallback = new LocalStorageAdapter();
  }

  setToken(token) {
    this.token = token;
  }

  async getItem(key, defaultValue = null) {
    if (!this.token) {
      return this.localFallback.getItem(key, defaultValue);
    }
    try {
      const res = await fetch(`${this.baseUrl}/storage/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (!res.ok) return this.localFallback.getItem(key, defaultValue);
      return await res.json();
    } catch (err) {
      console.warn(`[RemoteApiAdapter] Remote fetch failed for "${key}", falling back to local:`, err);
      return this.localFallback.getItem(key, defaultValue);
    }
  }

  async setItem(key, value) {
    // Write locally first for instant optimistic response & offline resilience
    this.localFallback.setItem(key, value);
    if (!this.token) return true;

    try {
      await fetch(`${this.baseUrl}/storage/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ value }),
      });
      return true;
    } catch (err) {
      console.warn(`[RemoteApiAdapter] Remote sync failed for "${key}", queued locally:`, err);
      return false;
    }
  }
}

// Active singleton instance
export const storageService = new LocalStorageAdapter();
export default storageService;
