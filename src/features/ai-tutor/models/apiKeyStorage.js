/**
 * API Key Storage & Multi-Provider Manager
 * Supports up to 5 API keys for OpenAI (ChatGPT), Anthropic (Claude), and Google Gemini.
 * Keys are stored 100% locally in browser localStorage (jct_ai_api_keys_v1).
 * Never transmitted to any 3rd-party backend or telemetry server.
 */

export const MAX_API_KEYS = 5;
export const API_KEYS_STORAGE_KEY = 'jct_ai_api_keys_v1';
export const LEGACY_OPENAI_STORAGE_KEY = 'jct_openai_api_key';

export const AI_PROVIDERS = {
  openai: {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    shortName: 'OpenAI',
    badgeClass: 'ai-prov-badge--openai',
    websiteUrl: 'https://platform.openai.com/api-keys',
    keyPlaceholder: 'sk-proj-... or sk-...',
    keyPrefixPattern: /^sk-[A-Za-z0-9_-]{20,}$/,
    description: 'Powers GPT-4o, GPT-4o-mini, and ChatGPT reasoning models.',
    helpSteps: [
      'Sign in or sign up at https://platform.openai.com/',
      'Go to the "API Keys" section in the left sidebar navigation.',
      'Click "+ Create new secret key", name it (e.g., "Course Tracker"), and copy it.',
      'Paste your secret key into the input field above.',
    ],
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    shortName: 'Claude',
    badgeClass: 'ai-prov-badge--anthropic',
    websiteUrl: 'https://console.anthropic.com/settings/keys',
    keyPlaceholder: 'sk-ant-api03-...',
    keyPrefixPattern: /^sk-ant-[A-Za-z0-9_-]{20,}$/,
    description: 'Powers Claude 3.5 Sonnet, Claude 3 Opus, and Claude 3.5 Haiku.',
    helpSteps: [
      'Sign in to your Anthropic Console at https://console.anthropic.com/',
      'Navigate to "Settings" -> "API Keys".',
      'Click "Create Key", label it (e.g., "Java Course Tutor"), and copy the key string.',
      'Paste the key (starts with "sk-ant-...") into the field above.',
    ],
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    shortName: 'Gemini',
    badgeClass: 'ai-prov-badge--gemini',
    websiteUrl: 'https://aistudio.google.com/app/apikey',
    keyPlaceholder: 'AIzaSy...',
    keyPrefixPattern: /^AIzaSy[A-Za-z0-9_-]{30,}$/,
    description: 'Powers Gemini 1.5 Pro and Gemini 1.5 Flash with large context windows.',
    helpSteps: [
      'Visit Google AI Studio at https://aistudio.google.com/app/apikey',
      'Sign in with your Google Account and click "Create API key".',
      'Select a Google Cloud project or create a default one (free tier available).',
      'Copy the generated key (starts with "AIzaSy...") and paste it above.',
    ],
  },
};

/**
 * Returns today's date formatted as YYYY-MM-DD
 */
export function getTodayDateKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Mask an API key for safe display (e.g. sk-proj-••••••••abcd)
 */
export function maskApiKey(key = '') {
  const str = String(key || '').trim();
  if (str.length <= 8) return '••••••••';
  const prefix = str.slice(0, 6);
  const suffix = str.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

/**
 * Reads stored API keys from localStorage, migrating legacy keys if necessary.
 * @returns {Array<Object>} List of key records (max 5)
 */
export function getStoredApiKeys() {
  try {
    const raw = localStorage.getItem(API_KEYS_STORAGE_KEY);
    let keys = [];
    if (raw) {
      keys = JSON.parse(raw);
      if (!Array.isArray(keys)) keys = [];
    }

    // Check for legacy single OpenAI key migration
    const legacyKey = localStorage.getItem(LEGACY_OPENAI_STORAGE_KEY);
    if (legacyKey && legacyKey.trim()) {
      const trimmed = legacyKey.trim();
      const alreadyExists = keys.some((k) => k.key === trimmed);
      if (!alreadyExists && keys.length < MAX_API_KEYS) {
        keys.push({
          id: 'key_legacy_openai',
          provider: 'openai',
          label: 'OpenAI (Imported)',
          key: trimmed,
          addedAt: new Date().toISOString(),
          lastValidatedAt: getTodayDateKey(),
          status: 'valid',
        });
        localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(keys));
      }
    }

    return keys.slice(0, MAX_API_KEYS);
  } catch (err) {
    console.warn('[apiKeyStorage] Failed to read stored API keys:', err);
    return [];
  }
}

/**
 * Persists keys array to localStorage
 */
function persistApiKeys(keys) {
  try {
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(keys.slice(0, MAX_API_KEYS)));
    // Sync legacy key if an OpenAI key exists
    const openaiKey = keys.find((k) => k.provider === 'openai');
    if (openaiKey) {
      localStorage.setItem(LEGACY_OPENAI_STORAGE_KEY, openaiKey.key);
    } else {
      localStorage.removeItem(LEGACY_OPENAI_STORAGE_KEY);
    }
    return true;
  } catch (err) {
    console.error('[apiKeyStorage] Failed to persist API keys:', err);
    return false;
  }
}

/**
 * Validates key format against provider pattern
 */
export function validateKeyFormat(providerId, key) {
  const provider = AI_PROVIDERS[providerId];
  if (!provider) return { valid: false, error: 'Unknown provider' };
  const str = String(key || '').trim();
  if (!str) return { valid: false, error: 'API key cannot be empty' };

  if (provider.keyPrefixPattern && !provider.keyPrefixPattern.test(str)) {
    return {
      valid: false,
      error: `Invalid key format for ${provider.name}. Must start with ${provider.keyPlaceholder.split('...')[0]}`,
    };
  }

  return { valid: true, error: null };
}

/**
 * Add a new API key record
 */
export function addApiKey({ provider, key, label }) {
  const keys = getStoredApiKeys();
  if (keys.length >= MAX_API_KEYS) {
    return { success: false, error: `Maximum of ${MAX_API_KEYS} API keys reached. Delete an existing key first.` };
  }

  const trimmedKey = String(key || '').trim();
  const formatCheck = validateKeyFormat(provider, trimmedKey);
  if (!formatCheck.valid) {
    return { success: false, error: formatCheck.error };
  }

  // Check duplicate
  if (keys.some((k) => k.key === trimmedKey)) {
    return { success: false, error: 'This API key has already been added.' };
  }

  const newRecord = {
    id: `key_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    provider,
    label: (label || '').trim() || `${AI_PROVIDERS[provider]?.shortName || provider} Key`,
    key: trimmedKey,
    addedAt: new Date().toISOString(),
    lastValidatedAt: getTodayDateKey(),
    status: 'valid',
  };

  keys.push(newRecord);
  persistApiKeys(keys);
  return { success: true, record: newRecord, keys };
}

/**
 * Delete an API key record by ID
 */
export function deleteApiKey(id) {
  const keys = getStoredApiKeys();
  const filtered = keys.filter((k) => k.id !== id);
  persistApiKeys(filtered);
  return filtered;
}

/**
 * Validate connection of a specific key
 */
export async function testApiKeyConnection(providerId, key) {
  const format = validateKeyFormat(providerId, key);
  if (!format.valid) {
    return { ok: false, error: format.error };
  }

  try {
    if (providerId === 'openai') {
      const resp = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(6000),
      });
      if (resp.status === 200) {
        return { ok: true, message: 'Connected to OpenAI API successfully' };
      }
      if (resp.status === 401) {
        return { ok: false, error: 'Invalid OpenAI API key (Authentication 401)' };
      }
      return { ok: false, error: `OpenAI returned status ${resp.status}` };
    }

    if (providerId === 'gemini') {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, {
        signal: AbortSignal.timeout(6000),
      });
      if (resp.status === 200) {
        return { ok: true, message: 'Connected to Google Gemini API successfully' };
      }
      if (resp.status === 400 || resp.status === 403) {
        return { ok: false, error: 'Invalid Google Gemini API key' };
      }
      return { ok: false, error: `Google API returned status ${resp.status}` };
    }

    if (providerId === 'anthropic') {
      // Anthropic does not allow cross-origin requests directly from browser web clients
      // without CORS proxy or backend; format validation is used client-side
      return { ok: true, message: 'Anthropic key format is valid (ready for Claude)' };
    }

    return { ok: true, message: 'Key validated' };
  } catch (err) {
    // If network error/offline, keep valid format
    return { ok: true, message: `Key format valid (${err.name === 'TimeoutError' ? 'timed out' : 'offline/cors checked'})` };
  }
}

/**
 * Validates all stored keys if not validated today.
 * Runs on app start or settings mount.
 */
export async function validateStoredKeysDaily() {
  const todayKey = getTodayDateKey();
  const keys = getStoredApiKeys();
  let updated = false;

  for (const k of keys) {
    if (k.lastValidatedAt !== todayKey) {
      const res = await testApiKeyConnection(k.provider, k.key);
      k.status = res.ok ? 'valid' : 'invalid';
      k.lastValidatedAt = todayKey;
      updated = true;
    }
  }

  if (updated) {
    persistApiKeys(keys);
  }
  return keys;
}

