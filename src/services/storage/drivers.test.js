import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageDriver } from './StorageDriver.js';
import { MemoryStorageDriver } from './MemoryStorageDriver.js';
import { LocalStorageDriver } from './LocalStorageDriver.js';
import { StorageService } from '../storageService.js';

describe('Storage Drivers & Fallback System', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('StorageDriver Base Contract', () => {
    it('throws errors for unimplemented abstract methods', () => {
      const base = new StorageDriver();
      expect(() => base.isAvailable()).toThrow();
      expect(() => base.get('k')).toThrow();
      expect(() => base.set('k', 'v')).toThrow();
      expect(() => base.remove('k')).toThrow();
      expect(() => base.keys()).toThrow();
      expect(() => base.clear()).toThrow();
    });
  });

  describe('MemoryStorageDriver', () => {
    it('stores, retrieves, removes, and lists keys correctly', () => {
      const driver = new MemoryStorageDriver();
      expect(driver.isAvailable()).toBe(true);

      expect(driver.get('test_key', 'fallback_val')).toBe('fallback_val');

      driver.set('test_key', { count: 42, active: true });
      expect(driver.get('test_key')).toEqual({ count: 42, active: true });
      expect(driver.keys()).toEqual(['test_key']);

      driver.remove('test_key');
      expect(driver.get('test_key')).toBeNull();
      expect(driver.keys()).toEqual([]);
    });

    it('isolates stored data from subsequent in-memory mutations', () => {
      const driver = new MemoryStorageDriver();
      const payload = { nested: { val: 10 } };
      driver.set('payload', payload);

      // Mutate local object
      payload.nested.val = 999;

      // Stored value should remain untouched
      expect(driver.get('payload')).toEqual({ nested: { val: 10 } });
    });

    it('handles simulated quota errors', () => {
      const driver = new MemoryStorageDriver();
      driver.simulateQuota(true);

      expect(() => driver.set('any', 'value')).toThrow(/QuotaExceededError/);
    });
  });

  describe('LocalStorageDriver', () => {
    it('interacts with window.localStorage and computes approximate usage bytes', () => {
      const driver = new LocalStorageDriver();
      expect(driver.isAvailable()).toBe(true);

      driver.set('driver_item', { text: 'hello' });
      expect(driver.get('driver_item')).toEqual({ text: 'hello' });
      expect(driver.keys()).toContain('driver_item');
      expect(driver.getUsageBytes()).toBeGreaterThan(0);

      driver.remove('driver_item');
      expect(driver.get('driver_item')).toBeNull();
    });

    it('detects quota errors and dispatches jct:storage_quota_exceeded', () => {
      const driver = new LocalStorageDriver();
      const quotaErr = new Error('Quota exceeded');
      quotaErr.name = 'QuotaExceededError';
      quotaErr.code = 22;

      expect(driver.isQuotaExceeded(quotaErr)).toBe(true);

      const eventSpy = vi.fn();
      window.addEventListener('jct:storage_quota_exceeded', eventSpy);

      vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
        throw quotaErr;
      });

      expect(() => driver.set('fail_key', 'value')).toThrow(/Quota exceeded/);
      expect(eventSpy).toHaveBeenCalledTimes(1);

      window.removeEventListener('jct:storage_quota_exceeded', eventSpy);
    });

    it('returns default value when localStorage throws or fails to read', () => {
      const driver = new LocalStorageDriver();
      vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
        throw new Error('SecurityError: Access Denied');
      });

      const result = driver.get('denied_key', 'safe_default');
      expect(result).toBe('safe_default');
    });
  });

  describe('StorageService Fallback & Error Recovery', () => {
    it('operates normally with LocalStorageDriver when available', () => {
      const service = new StorageService();
      expect(service.isUsingFallback()).toBe(false);
      expect(service.getActiveDriver().name).toBe('localStorage');

      service.setItem('svc_test', { greeting: 'world' });
      expect(service.getItem('svc_test')).toEqual({ greeting: 'world' });
    });

    it('automatically activates fallback driver if primary driver is unavailable at boot', () => {
      const mockPrimary = new LocalStorageDriver();
      vi.spyOn(mockPrimary, 'isAvailable').mockReturnValue(false);

      const service = new StorageService(mockPrimary);
      expect(service.isUsingFallback()).toBe(true);
      expect(service.getActiveDriver().name).toBe('memory');

      service.setItem('offline_key', 'persisted_in_memory');
      expect(service.getItem('offline_key')).toBe('persisted_in_memory');
    });

    it('switches to fallback and copies existing items when primary driver throws QuotaExceededError', () => {
      const fallbackEventSpy = vi.fn();
      window.addEventListener('jct:storage_fallback_active', fallbackEventSpy);

      const primary = new LocalStorageDriver();
      const fallback = new MemoryStorageDriver();
      const service = new StorageService(primary, fallback);

      // Seed an existing key before quota error
      service.setItem('initial_key', 'preserved_state');

      // Simulate quota error on next write
      const quotaErr = new Error('Quota exceeded');
      quotaErr.name = 'QuotaExceededError';
      quotaErr.code = 22;
      vi.spyOn(primary, 'set').mockImplementationOnce(() => {
        throw quotaErr;
      });

      // Write that triggers quota failure
      const writeSuccess = service.setItem('overflow_key', 'recovered_in_fallback');
      expect(writeSuccess).toBe(true);
      expect(service.isUsingFallback()).toBe(true);
      expect(fallbackEventSpy).toHaveBeenCalledTimes(1);

      // Both the newly written key AND the previously seeded key should exist in fallback
      expect(service.getItem('overflow_key')).toBe('recovered_in_fallback');
      expect(service.getItem('initial_key')).toBe('preserved_state');

      window.removeEventListener('jct:storage_fallback_active', fallbackEventSpy);
    });
  });
});
