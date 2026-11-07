import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  credentialsRepository,
  CredentialsRepository,
  AI_PROVIDERS,
  MAX_CREDENTIAL_KEYS,
  CREDENTIALS_STORAGE_KEY,
  LEGACY_OPENAI_KEY,
  sanitizeErrorMessage,
  maskApiKey,
} from './credentialsRepository.js';
import { getStoredApiKey, setStoredApiKey, verifyOpenAiApiKey } from '../../motivation/models/apiKeyModel.js';
import { getStoredApiKeys, addApiKey, deleteApiKey } from './apiKeyStorage.js';

describe('Credentials Repository & Unified Security Layer', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Legacy OpenAI Key Migration (jct_openai_api_key_v1)', () => {
    it('migrates legacy OpenAI key into unified store and NEVER deletes the legacy entry', () => {
      const mockKey = ['sk', '-proj-legacy-key-migration-12345'].join('');
      localStorage.setItem(LEGACY_OPENAI_KEY, mockKey);

      // Create a fresh instance to test initial access migration
      const repo = new CredentialsRepository();
      const keys = repo.getAllKeys();

      // Verified copied into unified store
      expect(keys).toHaveLength(1);
      expect(keys[0].provider).toBe('openai');
      expect(keys[0].key).toBe(mockKey);
      expect(keys[0].label).toContain('OpenAI');

      // CRITICAL INVARIANT: The legacy entry MUST remain in localStorage
      expect(localStorage.getItem(LEGACY_OPENAI_KEY)).toBe(mockKey);
    });

    it('does NOT overwrite existing OpenAI key in unified store if one is already present', () => {
      const existingKey = ['sk', '-proj-primary-key-existing-00000'].join('');
      const legacyKey = ['sk', '-proj-old-legacy-key-ignored-99999'].join('');

      // Pre-populate unified store with an OpenAI key
      localStorage.setItem(
        CREDENTIALS_STORAGE_KEY,
        JSON.stringify([
          {
            id: 'key_1',
            provider: 'openai',
            label: 'OpenAI Existing',
            key: existingKey,
            addedAt: '2026-11-01T00:00:00.000Z',
          },
        ])
      );
      localStorage.setItem(LEGACY_OPENAI_KEY, legacyKey);

      const repo = new CredentialsRepository();
      const keys = repo.getAllKeys();

      expect(keys).toHaveLength(1);
      expect(keys[0].key).toBe(existingKey);
      // Legacy key still remains intact
      expect(localStorage.getItem(LEGACY_OPENAI_KEY)).toBe(legacyKey);
    });
  });

  describe('Multi-Provider Key Management (OpenAI, Anthropic, Gemini, Groq)', () => {
    it('supports adding and querying keys for all 4 supported providers', () => {
      const repo = new CredentialsRepository();
      const mockOpenAi = ['sk', '-proj-openai-key-abcde12345'].join('');
      const mockAnthropic = ['sk', '-ant-api03-anthropic-key-1234567890'].join('');
      const mockGemini = ['AIza', 'SyGeminiApiKeyTest123456789012345'].join('');
      const mockGroq = ['gsk', '_groqApiKeyTest123456789012345678'].join('');

      const res1 = repo.addKey({ provider: 'openai', key: mockOpenAi });
      const res2 = repo.addKey({ provider: 'anthropic', key: mockAnthropic });
      const res3 = repo.addKey({ provider: 'gemini', key: mockGemini });
      const res4 = repo.addKey({ provider: 'groq', key: mockGroq });

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(true);
      expect(res3.success).toBe(true);
      expect(res4.success).toBe(true);

      expect(repo.getKey('openai')).toBe(mockOpenAi);
      expect(repo.getKey('anthropic')).toBe(mockAnthropic);
      expect(repo.getKey('gemini')).toBe(mockGemini);
      expect(repo.getKey('groq')).toBe(mockGroq);
    });

    it('rejects duplicate keys and enforces maximum key limit of 5', () => {
      const repo = new CredentialsRepository();
      const mockKey1 = ['sk', '-proj-dup-check-key-111111111'].join('');
      const mockKey2 = ['sk', '-proj-dup-check-key-222222222'].join('');
      const mockKey3 = ['sk', '-proj-dup-check-key-333333333'].join('');
      const mockKey4 = ['sk', '-proj-dup-check-key-444444444'].join('');
      const mockKey5 = ['sk', '-proj-dup-check-key-555555555'].join('');
      const mockKey6 = ['sk', '-proj-dup-check-key-666666666'].join('');

      repo.addKey({ provider: 'openai', key: mockKey1 });
      const dupRes = repo.addKey({ provider: 'openai', key: mockKey1 });
      expect(dupRes.success).toBe(false);
      expect(dupRes.error).toContain('already been added');

      repo.addKey({ provider: 'openai', key: mockKey2 });
      repo.addKey({ provider: 'openai', key: mockKey3 });
      repo.addKey({ provider: 'openai', key: mockKey4 });
      repo.addKey({ provider: 'openai', key: mockKey5 });

      expect(repo.getAllKeys()).toHaveLength(MAX_CREDENTIAL_KEYS);

      const overflowRes = repo.addKey({ provider: 'openai', key: mockKey6 });
      expect(overflowRes.success).toBe(false);
      expect(overflowRes.error).toContain('Maximum of 5 API keys reached');
    });

    it('validates key prefix format against provider specifications', () => {
      const repo = new CredentialsRepository();
      expect(repo.validateKeyFormat('openai', 'invalid-openai-key').valid).toBe(false);
      expect(repo.validateKeyFormat('anthropic', 'bad-prefix-12345').valid).toBe(false);
      expect(repo.validateKeyFormat('gemini', 'sk-not-gemini-12345').valid).toBe(false);
      expect(repo.validateKeyFormat('groq', 'bad-groq-prefix-12345').valid).toBe(false);
      expect(repo.validateKeyFormat('unknown', 'sk-proj-something').valid).toBe(false);
    });
  });

  describe('Routing of Legacy apiKeyModel & apiKeyStorage', () => {
    it('routes apiKeyModel reads and writes through credentialsRepository while keeping legacy key in sync', () => {
      const testKey = ['sk', '-proj-routed-through-model-12345'].join('');

      // Write through legacy model
      setStoredApiKey(testKey);

      // Verify read through repository and legacy getter
      expect(getStoredApiKey()).toBe(testKey);
      expect(credentialsRepository.getKey('openai')).toBe(testKey);
      expect(localStorage.getItem(LEGACY_OPENAI_KEY)).toBe(testKey);

      // Remove through legacy model
      setStoredApiKey('');
      expect(getStoredApiKey()).toBe('');
      expect(credentialsRepository.getKey('openai')).toBe('');
      expect(localStorage.getItem(LEGACY_OPENAI_KEY)).toBeNull();
    });

    it('routes apiKeyStorage operations through credentialsRepository seamlessly', () => {
      const mockKey = ['sk', '-proj-routed-through-storage-12345'].join('');

      const addRes = addApiKey({ provider: 'openai', key: mockKey, label: 'Test Route' });
      expect(addRes.success).toBe(true);

      const keys = getStoredApiKeys();
      expect(keys).toHaveLength(1);
      expect(keys[0].key).toBe(mockKey);

      deleteApiKey(keys[0].id);
      expect(getStoredApiKeys()).toHaveLength(0);
    });
  });

  describe('Security & Privacy: Zero Key Leakage in Logs or Error Messages', () => {
    it('sanitizes and redacts raw secret keys from all error messages', () => {
      const rawSecret = ['sk', '-proj-sensitive-secret-token-to-redact'].join('');
      const rawError = `Failed to connect to OpenAI endpoint with key ${rawSecret}: 401 Unauthorized`;

      const sanitized = sanitizeErrorMessage(rawError, rawSecret);

      expect(sanitized).not.toContain(rawSecret);
      expect(sanitized).toContain('[REDACTED_API_KEY]');
    });

    it('redacts generic API key regex patterns even if raw key parameter is omitted', () => {
      const leakedKey = ['sk', '-ant-secretAnthropicKey1234567890'].join('');
      const leakedMsg = `Error in fetch: ${leakedKey} connection dropped`;
      const sanitized = sanitizeErrorMessage(leakedMsg);

      expect(sanitized).not.toContain('secretAnthropicKey1234567890');
      expect(sanitized).toContain('[REDACTED_ANTHROPIC_KEY]');
    });

    it('verifyProviderKey never reveals secret keys in returned error objects', async () => {
      const secretToProtect = ['sk', '-proj-never-reveal-in-error-12345'].join('');

      // Mock fetch rejection with secret in error message
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(
        new Error(`Network timeout connecting with ${secretToProtect}`)
      );

      const result = await credentialsRepository.verifyProviderKey('openai', secretToProtect);

      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).not.toContain(secretToProtect);

      fetchSpy.mockRestore();
    });

    it('masks keys properly for safe UI presentation', () => {
      const openAiKey = ['sk', '-proj-1234567890abcdef'].join('');
      const masked = maskApiKey(openAiKey);
      expect(masked.startsWith('sk-pro')).toBe(true);
      expect(masked.endsWith('cdef')).toBe(true);
      expect(masked).toContain('••••••••');
      expect(masked).not.toContain('1234567890');

      expect(maskApiKey('short')).toBe('••••••••');
    });
  });

  describe('Unified Verification Logic', () => {
    it('handles live OpenAI API verification responses correctly', async () => {
      const mockKey = ['sk', '-proj-mock-verification-test'].join('');

      // Test 200 OK
      const fetchSuccess = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        status: 200,
        json: async () => ({ data: [{ id: 'gpt-4o' }] }),
      });

      const okRes = await verifyOpenAiApiKey(mockKey);
      expect(okRes.ok).toBe(true);
      expect(okRes.status).toBe(200);

      // Test 401 Unauthorized
      fetchSuccess.mockResolvedValue({
        status: 401,
        json: async () => ({ error: { message: 'Invalid API key' } }),
      });

      const unauthRes = await verifyOpenAiApiKey(mockKey);
      expect(unauthRes.ok).toBe(false);
      expect(unauthRes.status).toBe(401);
      expect(unauthRes.error).toContain('Authentication failed (401)');

      // Test 429 Quota Exceeded
      fetchSuccess.mockResolvedValue({
        status: 429,
        json: async () => ({ error: { message: 'Rate limit' } }),
      });

      const quotaRes = await verifyOpenAiApiKey(mockKey);
      expect(quotaRes.ok).toBe(false);
      expect(quotaRes.status).toBe(429);
      expect(quotaRes.error).toContain('Quota exceeded (429)');

      fetchSuccess.mockRestore();
    });
  });
});

