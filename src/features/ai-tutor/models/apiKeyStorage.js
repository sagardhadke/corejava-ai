/**
 * API Key Storage & Multi-Provider Adapter Layer
 *
 * Provides backwards-compatible adapter interface routing all reads, writes,
 * and live verifications through the unified `credentialsRepository`.
 *
 * Supports OpenAI, Anthropic, Google Gemini, and Groq.
 */

import {
  credentialsRepository,
  AI_PROVIDERS,
  MAX_CREDENTIAL_KEYS,
  CREDENTIALS_STORAGE_KEY,
  LEGACY_OPENAI_KEY,
  getTodayDateKey,
  maskApiKey,
  sanitizeErrorMessage,
} from './credentialsRepository.js';

export const MAX_API_KEYS = MAX_CREDENTIAL_KEYS;
export const API_KEYS_STORAGE_KEY = CREDENTIALS_STORAGE_KEY;
export const LEGACY_OPENAI_STORAGE_KEY = LEGACY_OPENAI_KEY;

export { AI_PROVIDERS, getTodayDateKey, maskApiKey, sanitizeErrorMessage };

/**
 * Reads stored API keys from the unified credentials repository.
 * @returns {Array<object>} List of key records (max 5)
 */
export function getStoredApiKeys() {
  return credentialsRepository.getAllKeys();
}

/**
 * Validates key format against provider's pattern
 * @param {string} providerId
 * @param {string} key
 * @returns {{ valid: boolean, error: string|null }}
 */
export function validateKeyFormat(providerId, key) {
  return credentialsRepository.validateKeyFormat(providerId, key);
}

/**
 * Adds a new API key record to the unified store
 * @param {{ provider: string, key: string, label?: string }} options
 * @returns {{ success: boolean, error?: string, record?: object, keys?: Array<object> }}
 */
export function addApiKey({ provider, key, label }) {
  return credentialsRepository.addKey({ provider, key, label });
}

/**
 * Deletes an API key record by ID
 * @param {string} id
 * @returns {Array<object>}
 */
export function deleteApiKey(id) {
  return credentialsRepository.deleteKey(id);
}

/**
 * Validates connection of a specific key via unified verification logic
 * @param {string} providerId
 * @param {string} key
 * @returns {Promise<{ ok: boolean, message?: string, error?: string }>}
 */
export async function testApiKeyConnection(providerId, key) {
  return credentialsRepository.verifyProviderKey(providerId, key);
}

/**
 * Validates all stored keys once per calendar day
 * @returns {Promise<Array<object>>}
 */
export async function validateStoredKeysDaily() {
  return credentialsRepository.validateDaily();
}
