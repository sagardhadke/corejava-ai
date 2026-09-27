const API_KEY_STORAGE = 'jct_openai_api_key_v1';

export function getStoredApiKey() {
  try {
    const direct = localStorage.getItem(API_KEY_STORAGE) || '';
    if (direct.trim()) return direct.trim();
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('jct_settings__')) {
        try {
          const s = JSON.parse(localStorage.getItem(k));
          if (s?.apiKey && typeof s.apiKey === 'string' && s.apiKey.trim()) return s.apiKey.trim();
          if (s?.openaiApiKey && typeof s.openaiApiKey === 'string' && s.openaiApiKey.trim()) return s.openaiApiKey.trim();
        } catch {
          // ignore
        }
      }
    }
    return '';
  } catch {
    return '';
  }
}

export function setStoredApiKey(key) {
  try {
    const trimmed = typeof key === 'string' ? key.trim() : '';
    if (trimmed) localStorage.setItem(API_KEY_STORAGE, trimmed);
    else localStorage.removeItem(API_KEY_STORAGE);
  } catch {
    // ignore storage errors — the key just won't persist across reloads
  }
}
