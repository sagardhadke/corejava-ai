/**
 * Storage Driver Interface Contract
 *
 * Defines the common synchronous contract implemented by all physical storage drivers
 * (e.g. LocalStorageDriver, MemoryStorageDriver).
 *
 * ---
 * Future IndexedDB / Async Storage Adaptation Note:
 *
 * This interface currently enforces synchronous operations (`get`, `set`, `remove`, `keys`)
 * to align with React's synchronous initial render cycle (`useState(read)` in `useLocalStorage`)
 * and existing sync feature models.
 *
 * For future asynchronous drivers (IndexedDB, OPFS, or Remote Cloud Sync):
 * 1. An async-enabled facade or adapter will mirror this contract with Promise-based variants:
 *    `async get(key)`, `async set(key, value)`, `async remove(key)`, `async keys()`.
 * 2. To avoid async waterfalls during initial React component rendering, an in-memory
 *    read-through cache (seeded at app boot via IndexedDB snapshot) provides instant sync reads
 *    while writes flush asynchronously to the underlying IndexedDB object store with transactional durability.
 */

export class StorageDriver {
  /**
   * Human-readable driver name identifier
   * @type {string}
   */
  name = 'baseDriver';

  /**
   * Checks whether this driver is supported and operable in the current environment.
   * @returns {boolean}
   */
  isAvailable() {
    throw new Error('StorageDriver.isAvailable must be implemented by subclass.');
  }

  /**
   * Retrieves and deserializes a value by key.
   * @param {string} key
   * @param {*} [defaultValue=null]
   * @returns {*} Deserialized value, or defaultValue if key does not exist or parsing fails.
   */
  get(key, defaultValue = null) {
    throw new Error('StorageDriver.get must be implemented by subclass.');
  }

  /**
   * Serializes and persists a value by key.
   * @param {string} key
   * @param {*} value
   * @returns {boolean} True if successfully stored, false on error or quota rejection.
   */
  set(key, value) {
    throw new Error('StorageDriver.set must be implemented by subclass.');
  }

  /**
   * Removes a key and its stored value.
   * @param {string} key
   * @returns {boolean} True if successfully removed, false on error.
   */
  remove(key) {
    throw new Error('StorageDriver.remove must be implemented by subclass.');
  }

  /**
   * Lists all keys managed by this driver.
   * @returns {string[]}
   */
  keys() {
    throw new Error('StorageDriver.keys must be implemented by subclass.');
  }

  /**
   * Clears all stored data from this driver.
   * @returns {boolean}
   */
  clear() {
    throw new Error('StorageDriver.clear must be implemented by subclass.');
  }
}

export default StorageDriver;
