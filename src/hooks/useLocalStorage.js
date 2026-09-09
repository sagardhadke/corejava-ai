import { useState, useEffect, useCallback, useRef } from 'react';

// Generic localStorage-backed state. Reads once on mount, writes on every change.
// Guards against a corrupt/missing key by falling back to `initialValue`.
// Re-reads from storage whenever `storageKey` itself changes (e.g. switching
// the active course), rather than only on first mount.
export function useLocalStorage(storageKey, initialValue) {
  const read = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw !== null ? JSON.parse(raw) : initialValue;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    } catch {
      return initialValue;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const [value, setValue] = useState(read);
  const keyRef = useRef(storageKey);

  // If the key changes (course switch), reload from the new key's storage
  // instead of continuing to write under the old key.
  useEffect(() => {
    if (keyRef.current !== storageKey) {
      keyRef.current = storageKey;
      setValue(read());
    }
  }, [storageKey, read]);

  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // Storage full or unavailable (private browsing) — fail silently, in-memory state still works.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, value]);

  const update = useCallback((next) => {
    setValue((prev) => (typeof next === 'function' ? next(prev) : next));
  }, []);

  return [value, update];
}
