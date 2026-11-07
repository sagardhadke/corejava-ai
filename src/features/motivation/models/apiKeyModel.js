/**
 * Motivation Feature API Key Model (Legacy Compatibility Adapter)
 *
 * @deprecated Use `credentialsRepository` from `../../ai-tutor/models/credentialsRepository.js` instead.
 * All reads, writes, and verification logic are now routed through the unified `credentialsRepository`.
 * Kept for backwards compatibility across existing motivation and settings components.
 */

import { credentialsRepository } from '../../ai-tutor/models/credentialsRepository.js';

/**
 * Retrieves the stored OpenAI API key from the central credentials repository.
 * @returns {string} Plaintext OpenAI API key, or empty string if not configured.
 */
export function getStoredApiKey() {
  return credentialsRepository.getOpenAiApiKey();
}

/**
 * Persists the OpenAI API key to the central credentials repository
 * and keeps the legacy storage key in sync.
 * @param {string} key
 */
export function setStoredApiKey(key) {
  return credentialsRepository.setOpenAiApiKey(key);
}

/**
 * Validates an OpenAI API key against OpenAI's live REST API.
 * Delegates to the single unified verification implementation in credentialsRepository.
 *
 * @param {string} key
 * @returns {Promise<{ ok: boolean, status?: number, message?: string, error?: string }>}
 */
export async function verifyOpenAiApiKey(key) {
  return credentialsRepository.verifyProviderKey('openai', key);
}
