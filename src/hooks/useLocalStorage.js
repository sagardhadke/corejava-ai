import { useState, useEffect, useCallback } from 'react';

// Generic localStorage-backed state. Reads once on mount, writes on every change.
// Guards against a corrupt/missing key by falling back to `initialValue`.
// Re-reads from storage whenever `storageKey` itself changes (e.g. switching
// or replacing the active course), adjusting state immediately before effects run.
export function useLocalStorage(storageKey, initialValue) {
  const read = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw !== null ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
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
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // Storage full or unavailable (private browsing) — fail silently, in-memory state still works.
    }
  }, [storageKey, value]);

  const update = useCallback((next) => {
    setValue((prev) => (typeof next === 'function' ? next(prev) : next));
  }, []);

  return [value, update];
}
