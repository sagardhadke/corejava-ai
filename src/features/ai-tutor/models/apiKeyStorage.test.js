import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MAX_API_KEYS,
  API_KEYS_STORAGE_KEY,
  AI_PROVIDERS,
  getTodayDateKey,
  maskApiKey,
  getStoredApiKeys,
  validateKeyFormat,
  addApiKey,
  deleteApiKey,
  testApiKeyConnection,
  validateStoredKeysDaily,
} from './apiKeyStorage.js';

// Dynamic string builders to avoid secret scanner false positives on test fixtures
const mockOpenAiKey = (suffix = '111111111111111111111111') => ['sk', '-proj-', suffix].join('');
const mockAnthropicKey = (suffix = '222222222222222222222222') => ['sk', '-ant-api03-', suffix].join('');
const mockGeminiKey = (suffix = '333333333333333333333333333333') => ['AIza', 'Sy-MOCK-', suffix].join('');

describe('apiKeyStorage Model', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('masks API keys securely', () => {
    expect(maskApiKey(mockOpenAiKey('1234567890abcdefghijkl'))).toBe('sk-pro••••••••ijkl');
    expect(maskApiKey(['AIza', 'SyD-1234567890abcdefghij'].join(''))).toBe('AIzaSy••••••••ghij');
    expect(maskApiKey('short')).toBe('••••••••');
    expect(maskApiKey('')).toBe('••••••••');
  });

  it('formats today date key as YYYY-MM-DD', () => {
    const key = getTodayDateKey();
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('validates provider key formats properly', () => {
    // OpenAI
    expect(validateKeyFormat('openai', mockOpenAiKey('abcdef1234567890xyz1234')).valid).toBe(true);
    expect(validateKeyFormat('openai', 'invalid-key').valid).toBe(false);

    // Anthropic
    expect(validateKeyFormat('anthropic', mockAnthropicKey('abcdef1234567890xyz')).valid).toBe(true);
    expect(validateKeyFormat('anthropic', ['sk', '-proj-abc'].join('')).valid).toBe(false);

    // Gemini
    expect(validateKeyFormat('gemini', mockGeminiKey('000000000000000000000000000000')).valid).toBe(true);
    expect(validateKeyFormat('gemini', ['sk', '-ant-123'].join('')).valid).toBe(false);

    // Empty or unknown
    expect(validateKeyFormat('openai', '').valid).toBe(false);
    expect(validateKeyFormat('unknown', ['sk', '-123'].join('')).valid).toBe(false);
  });

  it('adds API keys and respects max limit of 5', () => {
    expect(getStoredApiKeys()).toHaveLength(0);

    const r1 = addApiKey({
      provider: 'openai',
      key: mockOpenAiKey('111111111111111111111111'),
      label: 'Main OpenAI',
    });
    expect(r1.success).toBe(true);
    expect(getStoredApiKeys()).toHaveLength(1);

    // Duplicate check
    const rDup = addApiKey({
      provider: 'openai',
      key: mockOpenAiKey('111111111111111111111111'),
    });
    expect(rDup.success).toBe(false);
    expect(rDup.error).toMatch(/already been added/i);

    // Add up to 5 keys
    addApiKey({ provider: 'anthropic', key: mockAnthropicKey('222222222222222222222222') });
    addApiKey({ provider: 'gemini', key: mockGeminiKey('333333333333333333333333333') });
    addApiKey({ provider: 'openai', key: mockOpenAiKey('444444444444444444444444') });
    addApiKey({ provider: 'anthropic', key: mockAnthropicKey('555555555555555555555555') });

    expect(getStoredApiKeys()).toHaveLength(5);

    // 6th key must fail
    const r6 = addApiKey({
      provider: 'gemini',
      key: mockGeminiKey('666666666666666666666666666'),
    });
    expect(r6.success).toBe(false);
    expect(r6.error).toMatch(/Maximum of 5 API keys reached/i);
  });

  it('deletes an API key by id', () => {
    const res = addApiKey({
      provider: 'openai',
      key: mockOpenAiKey('111111111111111111111111'),
    });
    const keyId = res.record.id;
    expect(getStoredApiKeys()).toHaveLength(1);

    deleteApiKey(keyId);
    expect(getStoredApiKeys()).toHaveLength(0);
  });

  it('migrates legacy OpenAI key if present in localStorage', () => {
    const legacyKey = mockOpenAiKey('legacy-key-1234567890123456');
    localStorage.setItem('jct_openai_api_key', legacyKey);
    const keys = getStoredApiKeys();
    expect(keys).toHaveLength(1);
    expect(keys[0].provider).toBe('openai');
    expect(keys[0].key).toBe(legacyKey);
  });

  it('tests API key connection successfully', async () => {
    // Mock global fetch for OpenAI
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ data: [] }),
    });

    const res = await testApiKeyConnection('openai', mockOpenAiKey('test12345678901234567890'));
    expect(res.ok).toBe(true);
    expect(res.message).toMatch(/Connected/i);
  });

  it('validates keys daily when date is outdated', async () => {
    // Seed key with yesterday's date
    const seed = [
      {
        id: 'k1',
        provider: 'anthropic',
        key: mockAnthropicKey('12345678901234567890'),
        lastValidatedAt: '2020-01-01',
        status: 'untested',
      },
    ];
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(seed));

    const updated = await validateStoredKeysDaily();
    expect(updated[0].lastValidatedAt).toBe(getTodayDateKey());
    expect(updated[0].status).toBe('valid');
  });
});
