import { useState, useEffect, useCallback } from 'react';
import { storageService } from '../services/storageService.js';

/**
 * Enterprise reactive storage hook.
 * Backed by storageService repository with quota safeguards, serialization recovery,
 * and seamless backend/cloud compatibility.
 */
export function useLocalStorage(storageKey, initialValue) {
  const read = useCallback(() => {
    return storageService.getItem(storageKey, initialValue);
  }, [storageKey, initialValue]);

  const [prevKey, setPrevKey] = useState(storageKey);
  const [value, setValue] = useState(read);

  // If storageKey changed (e.g. course switch or replacement),
  // adjust state immediately during render to prevent writing old values
  // to the new key.
  if (storageKey !== prevKey) {
    setPrevKey(storageKey);
    setValue(read());
  }

  useEffect(() => {
    storageService.setItem(storageKey, value);
  }, [storageKey, value]);

  const update = useCallback((next) => {
    setValue((prev) => (typeof next === 'function' ? next(prev) : next));
  }, []);

  return [value, update];
}
