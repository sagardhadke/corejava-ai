const API_KEY_STORAGE = 'jct_openai_api_key_v1';

export function getStoredApiKey() {
  try {
    return localStorage.getItem(API_KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function setStoredApiKey(key) {
  try {
    if (key) localStorage.setItem(API_KEY_STORAGE, key);
    else localStorage.removeItem(API_KEY_STORAGE);
  } catch {
    // ignore storage errors — the key just won't persist across reloads
  }
}
