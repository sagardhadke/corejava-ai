/**
 * Shared localStorage mock for Vitest component tests.
 * Sets up and tears down an in-memory mock before/after each test.
 */

class InMemoryLocalStorage {
  constructor() {
    this._store = new Map();
  }
  getItem(key) {
    return this._store.has(key) ? this._store.get(key) : null;
  }
  setItem(key, value) {
    this._store.set(String(key), String(value));
  }
  removeItem(key) {
    this._store.delete(key);
  }
  clear() {
    this._store.clear();
  }
  key(index) {
    return Array.from(this._store.keys())[index] ?? null;
  }
  get length() {
    return this._store.size;
  }
}

export function setupLocalStorageMock() {
  const mock = new InMemoryLocalStorage();
  Object.defineProperty(globalThis, 'localStorage', {
    value: mock,
    writable: true,
    configurable: true,
  });
  return mock;
}

