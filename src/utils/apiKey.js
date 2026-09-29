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

/**
 * Validates an OpenAI API key against OpenAI's live REST API.
 * Uses GET /v1/models to verify authentication without consuming token quota.
 *
 * @param {string} key
 * @returns {Promise<{ ok: boolean, status?: number, message?: string, error?: string }>}
 */
export async function verifyOpenAiApiKey(key) {
  if (!key || typeof key !== 'string' || !key.trim()) {
    return {
      ok: false,
      error: 'Please enter an OpenAI API key to test.',
    };
  }

  const cleanKey = key.trim();

  // Basic sanity check on key prefix
  if (!cleanKey.startsWith('sk-')) {
    return {
      ok: false,
      error: 'Invalid format. OpenAI API keys start with "sk-". Please check the key.',
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const res = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cleanKey}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.status === 200) {
      const data = await res.json().catch(() => null);
      const count = Array.isArray(data?.data) ? data.data.length : 0;
      return {
        ok: true,
        status: 200,
        message: `API key is verified and working! Connected to OpenAI successfully (${count} models active).`,
      };
    }

    if (res.status === 401) {
      return {
        ok: false,
        status: 401,
        error: 'Authentication failed (401). The API key is invalid, expired, or was revoked.',
      };
    }

    if (res.status === 429) {
      return {
        ok: false,
        status: 429,
        error: 'Quota exceeded (429). Check your OpenAI account billing balance and usage limits.',
      };
    }

    if (res.status === 403) {
      return {
        ok: false,
        status: 403,
        error: 'Forbidden (403). This API key does not have permission to access OpenAI services.',
      };
    }

    const errData = await res.json().catch(() => null);
    const detail = errData?.error?.message || `HTTP ${res.status}`;
    return {
      ok: false,
      status: res.status,
      error: `OpenAI returned error: ${detail}`,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      return {
        ok: false,
        error: 'Request timed out after 9 seconds. Please check your internet connection.',
      };
    }
    const msg = err?.message || '';
    return {
      ok: false,
      error: msg.includes('Failed to fetch')
        ? 'Network request failed. Check your internet connection or browser ad/tracker blockers.'
        : `Connection failed: ${msg || 'Unable to reach OpenAI servers'}`,
    };
  }
}
