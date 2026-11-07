/**
 * Enterprise Storage Service & Repository Abstraction Layer
 *
 * Implements a pluggable Repository pattern decoupling client state from physical storage.
 * Manages physical storage drivers (LocalStorageDriver with automatic MemoryStorageDriver fallback)
 * with quota monitoring, error recovery, and serialization guards.
 */

import { LocalStorageDriver } from './storage/LocalStorageDriver.js';
import { MemoryStorageDriver } from './storage/MemoryStorageDriver.js';

export class StorageService {
  constructor(primaryDriver = new LocalStorageDriver(), fallbackDriver = new MemoryStorageDriver()) {
    this.primaryDriver = primaryDriver;
    this.fallbackDriver = fallbackDriver;
    this._usingFallback = false;

    // Check initial availability
    if (!this.primaryDriver.isAvailable()) {
      this._activateFallback('Primary storage driver unavailable at startup');
    }
  }

  /**
   * Indicates whether the storage service is currently operating in fallback mode.
   * @returns {boolean}
   */
  isUsingFallback() {
    return this._usingFallback;
  }

  /**
   * Returns the currently active storage driver.
   * @returns {import('./storage/StorageDriver.js').StorageDriver}
   */
  getActiveDriver() {
    return this._usingFallback ? this.fallbackDriver : this.primaryDriver;
  }

  /**
   * Transitions to the in-memory fallback driver upon storage failure or quota exhaustion.
   * Copies available items from the primary driver to preserve session state.
   * @param {string|Error} [reason]
   * @private
   */
  _activateFallback(reason) {
    if (this._usingFallback) return;
    this._usingFallback = true;
    console.warn('[StorageService] Switching to in-memory fallback driver:', reason);

    // Attempt to seed fallback driver with any accessible keys from primary
    try {
      if (this.primaryDriver && typeof this.primaryDriver.keys === 'function') {
        const existingKeys = this.primaryDriver.keys();
        for (const k of existingKeys) {
          const v = this.primaryDriver.get(k);
          if (v !== null && v !== undefined) {
            this.fallbackDriver.set(k, v);
          }
        }
      }
    } catch (copyErr) {
      console.warn('[StorageService] Could not copy existing keys to fallback driver:', copyErr);
    }

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(
        new CustomEvent('jct:storage_fallback_active', {
          detail: { reason: reason ? String(reason) : 'unknown' },
        })
      );
    }
  }

  isAvailable() {
    return this.getActiveDriver().isAvailable();
  }

  getItem(key, defaultValue = null) {
    if (this._usingFallback) {
      return this.fallbackDriver.get(key, defaultValue);
    }
    try {
      return this.primaryDriver.get(key, defaultValue);
    } catch (err) {
      console.warn(`[StorageService] Failed to read "${key}" from primary driver, switching to fallback:`, err);
      this._activateFallback(err);
      return this.fallbackDriver.get(key, defaultValue);
    }
  }

  setItem(key, value) {
    if (this._usingFallback) {
      return this.fallbackDriver.set(key, value);
    }
    try {
      return this.primaryDriver.set(key, value);
    } catch (err) {
      this._activateFallback(err);
      return this.fallbackDriver.set(key, value);
    }
  }

  removeItem(key) {
    const activeResult = this.getActiveDriver().remove(key);
    // Also remove from fallback driver if it was seeded
    if (!this._usingFallback) {
      this.fallbackDriver.remove(key);
    }
    return activeResult;
  }

  clear() {
    this.fallbackDriver.clear();
    return this.getActiveDriver().clear();
  }

  keys() {
    return this.getActiveDriver().keys();
  }

  get(key, defaultValue = null) {
    return this.getItem(key, defaultValue);
  }

  set(key, value) {
    return this.setItem(key, value);
  }

  remove(key) {
    return this.removeItem(key);
  }

  getUsageBytes() {
    if (!this._usingFallback && typeof this.primaryDriver.getUsageBytes === 'function') {
      return this.primaryDriver.getUsageBytes();
    }
    return 0;
  }

  isQuotaExceeded(err) {
    if (typeof this.primaryDriver.isQuotaExceeded === 'function') {
      return this.primaryDriver.isQuotaExceeded(err);
    }
    return false;
  }

  notifyQuotaExceeded() {
    if (typeof this.primaryDriver.notifyQuotaExceeded === 'function') {
      this.primaryDriver.notifyQuotaExceeded();
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
    this.localFallback = new StorageService();
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
export const storageService = new StorageService();
export { exportAllData as exportBackup, importAllData as restoreBackup } from '../data/courseStore.js';
export default storageService;
