/**
 * Central Credentials Repository
 *
 * Single source of truth for all AI provider API keys (OpenAI, Anthropic, Gemini, Groq).
 * Persists credentials strictly client-side under STORAGE_KEYS.AI_API_KEYS ('jct_ai_api_keys_v1').
 *
 * Security & Privacy Guarantees:
 * 1. Credentials are never sent to application servers, telemetry, or third parties.
 * 2. Raw keys are NEVER printed, logged, or included in error messages.
 * 3. Backups NEVER include credential keys.
 * 4. Dedicated credentials migration preserves legacy keys (jct_openai_api_key_v1) without deleting them.
 */

import {
  STORAGE_KEYS,
  LEGACY_STORAGE_KEYS,
  COURSE_KEY_PREFIXES,
} from '../../../services/storage/keys.js';

export const MAX_CREDENTIAL_KEYS = 5;
export const CREDENTIALS_STORAGE_KEY = STORAGE_KEYS.AI_API_KEYS;
export const LEGACY_OPENAI_KEY = STORAGE_KEYS.OPENAI_API_KEY;
export const OLD_LEGACY_OPENAI_KEY = LEGACY_STORAGE_KEYS.OPENAI_API_KEY;

/**
 * Supported AI Providers Configuration
 */
export const AI_PROVIDERS = Object.freeze({
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
  groq: {
    id: 'groq',
    name: 'Groq',
    shortName: 'Groq',
    badgeClass: 'ai-prov-badge--groq',
    websiteUrl: 'https://console.groq.com/keys',
    keyPlaceholder: 'gsk_...',
    keyPrefixPattern: /^gsk_[A-Za-z0-9_-]{20,}$/,
    description: 'Powers ultra-fast inference with Llama 3, Mixtral, and open LLM architectures.',
    helpSteps: [
      'Sign in or register at https://console.groq.com/',
      'Go to "API Keys" in the left sidebar console.',
      'Click "Create API Key", provide a name, and copy the secret key.',
      'Paste your key (starts with "gsk_...") into the field above.',
    ],
  },
});

/**
 * Returns today's date formatted as YYYY-MM-DD
 * @returns {string}
 */
export function getTodayDateKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Masks an API key for safe presentation (e.g. sk-proj••••••••abcd)
 * @param {string} key
 * @returns {string}
 */
export function maskApiKey(key = '') {
  const str = String(key || '').trim();
  if (str.length <= 8) return '••••••••';
  const prefix = str.slice(0, 6);
  const suffix = str.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

/**
 * Redacts any secret keys from an error message to prevent accidental credential leakage in logs or UI.
 * @param {string|Error} error
 * @param {string} [rawKey]
 * @returns {string}
 */
export function sanitizeErrorMessage(error, rawKey = '') {
  let message = typeof error === 'string' ? error : error?.message || 'An unknown error occurred.';

  // Strip exact raw key if provided
  if (rawKey && typeof rawKey === 'string' && rawKey.trim()) {
    message = message.split(rawKey.trim()).join('[REDACTED_API_KEY]');
  }

  // Strip common API key patterns from error message text (check more specific sk-ant- before sk-)
  message = message
    .replace(/sk-ant-[A-Za-z0-9_-]{20,}/g, '[REDACTED_ANTHROPIC_KEY]')
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, '[REDACTED_OPENAI_KEY]')
    .replace(/AIzaSy[A-Za-z0-9_-]{30,}/g, '[REDACTED_GEMINI_KEY]')
    .replace(/gsk_[A-Za-z0-9_-]{20,}/g, '[REDACTED_GROQ_KEY]');

  return message;
}

export class CredentialsRepository {
  /**
   * Internal storage access helper
   * @private
   */
  _getStorage() {
    return typeof window !== 'undefined' ? window.localStorage : globalThis.localStorage;
  }

  /**
   * Reads raw list from localStorage
   * @private
   */
  _readRawKeys() {
    try {
      const storage = this._getStorage();
      if (!storage) return [];
      const raw = storage.getItem(CREDENTIALS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Writes raw list to localStorage
   * @private
   */
  _writeRawKeys(keys) {
    try {
      const storage = this._getStorage();
      if (!storage) return false;
      storage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(keys.slice(0, MAX_CREDENTIAL_KEYS)));
      return true;
    } catch (err) {
      console.warn('[CredentialsRepository] Failed to persist credentials:', sanitizeErrorMessage(err));
      return false;
    }
  }

  /**
   * Dedicated credential migration from legacy storage keys:
   * 1. Copies legacy OpenAI key (jct_openai_api_key_v1) into unified store ONLY IF the unified store has no key for that provider.
   * 2. NEVER deletes the legacy entry (jct_openai_api_key_v1) to guarantee backwards compatibility.
   * 3. Also checks older legacy keys (jct_openai_api_key, jct_gemini_api_key, jct_anthropic_api_key, jct_groq_api_key) and per-course settings.
   */
  migrateLegacyCredentials() {
    const storage = this._getStorage();
    if (!storage) return;

    try {
      let keys = this._readRawKeys();
      let updated = false;

      // 1. Migrate legacy OpenAI key (STORAGE_KEYS.OPENAI_API_KEY)
      const hasOpenAi = keys.some((k) => k.provider === 'openai');
      if (!hasOpenAi && keys.length < MAX_CREDENTIAL_KEYS) {
        let legacyKey = (storage.getItem(LEGACY_OPENAI_KEY) || '').trim();

        // Fallback to older legacy key
        if (!legacyKey) {
          legacyKey = (storage.getItem(OLD_LEGACY_OPENAI_KEY) || '').trim();
        }

        // Fallback to embedded per-course settings keys
        if (!legacyKey) {
          for (let i = 0; i < storage.length; i++) {
            const k = storage.key(i);
            if (k && k.startsWith(COURSE_KEY_PREFIXES.SETTINGS)) {
              try {
                const s = JSON.parse(storage.getItem(k));
                if (s?.apiKey && typeof s.apiKey === 'string' && s.apiKey.trim()) {
                  legacyKey = s.apiKey.trim();
                  break;
                }
                if (s?.openaiApiKey && typeof s.openaiApiKey === 'string' && s.openaiApiKey.trim()) {
                  legacyKey = s.openaiApiKey.trim();
                  break;
                }
              } catch {
                // ignore invalid json
              }
            }
          }
        }

        if (legacyKey && legacyKey.startsWith('sk-')) {
          keys.push({
            id: 'key_migrated_openai',
            provider: 'openai',
            label: 'OpenAI (Primary)',
            key: legacyKey,
            addedAt: new Date().toISOString(),
            lastValidatedAt: getTodayDateKey(),
            status: 'valid',
          });
          updated = true;
          // CRITICAL: NEVER delete LEGACY_OPENAI_KEY in this PR!
        }
      }

      // 2. Migrate legacy individual provider keys if present and unified store lacks them
      const individualKeys = [
        { provider: 'anthropic', storageKey: 'jct_anthropic_api_key', label: 'Anthropic (Claude)' },
        { provider: 'gemini', storageKey: 'jct_gemini_api_key', label: 'Google Gemini' },
        { provider: 'groq', storageKey: 'jct_groq_api_key', label: 'Groq' },
      ];

      for (const item of individualKeys) {
        const hasProvider = keys.some((k) => k.provider === item.provider);
        if (!hasProvider && keys.length < MAX_CREDENTIAL_KEYS) {
          const rawVal = (storage.getItem(item.storageKey) || '').trim();
          if (rawVal) {
            keys.push({
              id: `key_migrated_${item.provider}`,
              provider: item.provider,
              label: item.label,
              key: rawVal,
              addedAt: new Date().toISOString(),
              lastValidatedAt: getTodayDateKey(),
              status: 'valid',
            });
            updated = true;
          }
        }
      }

      if (updated) {
        this._writeRawKeys(keys);
      }
    } catch (err) {
      console.warn('[CredentialsRepository] Credential migration error:', sanitizeErrorMessage(err));
    }
  }

  /**
   * Retrieves all stored credential records. Automatically checks migration on access.
   * @returns {Array<object>}
   */
  getAllKeys() {
    this.migrateLegacyCredentials();
    return this._readRawKeys();
  }

  /**
   * Alias for getAllKeys
   * @returns {Array<object>}
   */
  getStoredKeys() {
    return this.getAllKeys();
  }

  /**
   * Retrieves the active key string for a given provider.
   * @param {string} providerId
   * @returns {string} Plaintext API key, or empty string if not configured
   */
  getKey(providerId) {
    const keys = this.getAllKeys();
    const match = keys.find((k) => k.provider === providerId);
    if (match?.key) return match.key;

    // Fallback for OpenAI from legacy key if not yet in store
    if (providerId === 'openai') {
      const storage = this._getStorage();
      if (storage) {
        const legacy = (storage.getItem(LEGACY_OPENAI_KEY) || '').trim();
        if (legacy) return legacy;
      }
    }

    return '';
  }

  /**
   * Alias for getKey
   * @param {string} providerId
   * @returns {string}
   */
  getApiKey(providerId) {
    return this.getKey(providerId);
  }

  /**
   * Legacy compatibility helper: returns OpenAI API key.
   * @returns {string}
   */
  getOpenAiApiKey() {
    return this.getKey('openai');
  }

  /**
   * Sets or replaces the active key for a provider.
   * @param {string} providerId
   * @param {string} key
   * @param {string} [label]
   * @returns {{ success: boolean, error?: string, record?: object }}
   */
  setKey(providerId, key, label) {
    const trimmed = String(key || '').trim();
    if (!trimmed) {
      this.removeKeyByProvider(providerId);
      return { success: true };
    }

    let keys = this.getAllKeys();
    const existingIndex = keys.findIndex((k) => k.provider === providerId);

    const record = {
      id: existingIndex >= 0 ? keys[existingIndex].id : `key_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      provider: providerId,
      label: (label || '').trim() || `${AI_PROVIDERS[providerId]?.shortName || providerId} Key`,
      key: trimmed,
      addedAt: existingIndex >= 0 ? keys[existingIndex].addedAt : new Date().toISOString(),
      lastValidatedAt: getTodayDateKey(),
      status: 'valid',
    };

    if (existingIndex >= 0) {
      keys[existingIndex] = record;
    } else {
      if (keys.length >= MAX_CREDENTIAL_KEYS) {
        return { success: false, error: `Maximum of ${MAX_CREDENTIAL_KEYS} API keys reached. Delete an existing key first.` };
      }
      keys.push(record);
    }

    this._writeRawKeys(keys);

    // Keep legacy OpenAI key in sync for backwards compatibility
    if (providerId === 'openai') {
      const storage = this._getStorage();
      if (storage) {
        try {
          storage.setItem(LEGACY_OPENAI_KEY, trimmed);
        } catch {
          // ignore
        }
      }
    }

    return { success: true, record };
  }

  /**
   * Legacy compatibility helper: sets OpenAI API key.
   * Synchronizes both the unified store and LEGACY_OPENAI_KEY.
   * @param {string} key
   */
  setOpenAiApiKey(key) {
    return this.setKey('openai', key);
  }

  /**
   * Adds a new API key record to the store with full UI format validation.
   * @param {{ provider: string, key: string, label?: string }} options
   * @returns {{ success: boolean, error?: string, record?: object, keys?: Array<object> }}
   */
  addKey({ provider, key, label }) {
    const keys = this.getAllKeys();
    if (keys.length >= MAX_CREDENTIAL_KEYS) {
      return { success: false, error: `Maximum of ${MAX_CREDENTIAL_KEYS} API keys reached. Delete an existing key first.` };
    }

    const trimmed = String(key || '').trim();
    const formatCheck = this.validateKeyFormat(provider, trimmed);
    if (!formatCheck.valid) {
      return { success: false, error: formatCheck.error };
    }

    // Check duplicate
    if (keys.some((k) => k.key === trimmed)) {
      return { success: false, error: 'This API key has already been added.' };
    }

    const newRecord = {
      id: `key_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      provider,
      label: (label || '').trim() || `${AI_PROVIDERS[provider]?.shortName || provider} Key`,
      key: trimmed,
      addedAt: new Date().toISOString(),
      lastValidatedAt: getTodayDateKey(),
      status: 'valid',
    };

    keys.push(newRecord);
    this._writeRawKeys(keys);

    // Sync legacy key if OpenAI
    if (provider === 'openai') {
      const storage = this._getStorage();
      if (storage) {
        try {
          storage.setItem(LEGACY_OPENAI_KEY, trimmed);
        } catch {
          // ignore
        }
      }
    }

    return { success: true, record: newRecord, keys: this.getAllKeys() };
  }

  /**
   * Deletes an API key record by ID.
   * @param {string} id
   * @returns {Array<object>} Updated keys list
   */
  deleteKey(id) {
    const keys = this.getAllKeys();
    const filtered = keys.filter((k) => k.id !== id);
    this._writeRawKeys(filtered);

    // If removed key was OpenAI, sync legacy key
    const remainingOpenAi = filtered.find((k) => k.provider === 'openai');
    const storage = this._getStorage();
    if (storage) {
      try {
        if (remainingOpenAi) {
          storage.setItem(LEGACY_OPENAI_KEY, remainingOpenAi.key);
        } else {
          storage.removeItem(LEGACY_OPENAI_KEY);
        }
      } catch {
        // ignore
      }
    }

    return filtered;
  }

  /**
   * Removes any key configured for a specific provider.
   * @param {string} providerId
   * @returns {Array<object>}
   */
  removeKeyByProvider(providerId) {
    const keys = this.getAllKeys();
    const filtered = keys.filter((k) => k.provider !== providerId);
    this._writeRawKeys(filtered);

    if (providerId === 'openai') {
      const storage = this._getStorage();
      if (storage) {
        try {
          storage.removeItem(LEGACY_OPENAI_KEY);
        } catch {
          // ignore
        }
      }
    }

    return filtered;
  }

  /**
   * Validates key format against provider's defined pattern.
   * @param {string} providerId
   * @param {string} key
   * @returns {{ valid: boolean, error: string|null }}
   */
  validateKeyFormat(providerId, key) {
    const provider = AI_PROVIDERS[providerId];
    if (!provider) return { valid: false, error: 'Unknown provider' };
    const str = String(key || '').trim();
    if (!str) {
      return {
        valid: false,
        error: `Please enter an ${provider.shortName} API key to test.`,
      };
    }

    if (providerId === 'openai') {
      if (!str.startsWith('sk-')) {
        return {
          valid: false,
          error: 'Invalid key format for OpenAI. OpenAI API keys start with "sk-". Please check the key.',
        };
      }
      return { valid: true, error: null };
    }

    if (provider.keyPrefixPattern && !provider.keyPrefixPattern.test(str)) {
      return {
        valid: false,
        error: `Invalid key format for ${provider.name}. Must start with ${provider.keyPlaceholder.split('...')[0]}`,
      };
    }

    return { valid: true, error: null };
  }

  /**
   * Single unified implementation for testing and verifying provider API keys against live endpoints.
   * Replaces duplicated fetch implementations across the application.
   *
   * SECURITY GUARANTEE: Never prints, logs, or returns raw API keys in error strings.
   *
   * @param {string} providerId
   * @param {string} key
   * @returns {Promise<{ ok: boolean, status?: number, message?: string, error?: string }>}
   */
  async verifyProviderKey(providerId, key) {
    const cleanKey = String(key || '').trim();
    const formatCheck = this.validateKeyFormat(providerId, cleanKey);
    if (!formatCheck.valid) {
      return { ok: false, error: formatCheck.error };
    }

    try {
      if (providerId === 'openai') {
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
        const detail = sanitizeErrorMessage(errData?.error?.message || `HTTP ${res.status}`, cleanKey);
        return {
          ok: false,
          status: res.status,
          error: `OpenAI returned error: ${detail}`,
        };
      }

      if (providerId === 'gemini') {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`, {
          signal: AbortSignal.timeout(6000),
        });
        if (res.status === 200) {
          return { ok: true, status: 200, message: 'Connected to Google Gemini API successfully' };
        }
        if (res.status === 400 || res.status === 403) {
          return { ok: false, status: res.status, error: 'Invalid Google Gemini API key' };
        }
        return { ok: false, status: res.status, error: `Google API returned status ${res.status}` };
      }

      if (providerId === 'groq') {
        const res = await fetch('https://api.groq.com/openai/v1/models', {
          headers: { Authorization: `Bearer ${cleanKey}` },
          signal: AbortSignal.timeout(6000),
        });
        if (res.status === 200) {
          return { ok: true, status: 200, message: 'Connected to Groq API successfully' };
        }
        if (res.status === 401) {
          return { ok: false, status: 401, error: 'Authentication failed (401). Invalid Groq API key.' };
        }
        return { ok: false, status: res.status, error: `Groq returned status ${res.status}` };
      }

      if (providerId === 'anthropic') {
        // Anthropic does not support CORS requests directly from browser web clients
        return { ok: true, message: 'Anthropic key format is valid (ready for Claude)' };
      }

      return { ok: true, message: 'Key validated' };
    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'TimeoutError') {
        return {
          ok: false,
          error: 'Request timed out. Please check your internet connection.',
        };
      }
      const rawMsg = err?.message || '';
      const safeMsg = sanitizeErrorMessage(rawMsg, cleanKey);
      return {
        ok: false,
        error: safeMsg.includes('Failed to fetch')
          ? 'Network request failed. Check your internet connection or browser ad/tracker blockers.'
          : `Connection failed: ${safeMsg || 'Unable to reach provider servers'}`,
      };
    }
  }

  /**
   * Validates all stored keys once per calendar day.
   * @returns {Promise<Array<object>>}
   */
  async validateDaily() {
    const todayKey = getTodayDateKey();
    const keys = this.getAllKeys();
    let updated = false;

    for (const k of keys) {
      if (k.lastValidatedAt !== todayKey) {
        const res = await this.verifyProviderKey(k.provider, k.key);
        k.status = res.ok ? 'valid' : 'invalid';
        k.lastValidatedAt = todayKey;
        updated = true;
      }
    }

    if (updated) {
      this._writeRawKeys(keys);
    }
    return keys;
  }
}

// Active singleton instance
export const credentialsRepository = new CredentialsRepository();
export default credentialsRepository;
