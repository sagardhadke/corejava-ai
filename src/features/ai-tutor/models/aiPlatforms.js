/**
 * AI Platform Deep-Link Configurations
 *
 * Supported deep-link URL formats:
 * - ChatGPT: https://chatgpt.com/?q=<url-encoded-prompt>
 * - Claude:  https://claude.ai/new?q=<url-encoded-prompt>
 *
 * URL Length Constraints:
 * - RFC 9110 and standard reverse proxies (Cloudflare, Nginx) start returning
 *   HTTP 414 (URI Too Long) or HTTP 431 (Request Header Fields Too Large) once URLs
 *   exceed ~4KB to 8KB.
 * - ChatGPT safe cap is ~7,500 characters, but Claude's web limit is undocumented and
 *   shorter, with browser address bars (especially Safari & mobile webviews) historically
 *   capping around 2,000 characters.
 * - We enforce a named constant `DEFAULT_MAX_URL_LENGTH = 2000` as the conservative
 *   safe threshold for URL parameter embedding.
 */

export const DEFAULT_MAX_URL_LENGTH = 2000;

export const AI_PLATFORMS = {
  chatgpt: {
    id: 'chatgpt',
    name: 'ChatGPT',
    displayName: 'Ask ChatGPT',
    badge: 'OpenAI',
    baseUrl: 'https://chatgpt.com/',
    queryParam: 'q',
    maxUrlLength: DEFAULT_MAX_URL_LENGTH,
    buildUrl(encodedPrompt) {
      return `https://chatgpt.com/?q=${encodedPrompt}`;
    },
    buildShortPrompt({ scopeTitle, scopeType, courseTitle }) {
      return `I copied my course context. Paste it below, then help me with: ${scopeTitle} (${scopeType}) from course "${courseTitle}".`;
    },
  },
  claude: {
    id: 'claude',
    name: 'Claude',
    displayName: 'Ask Claude',
    badge: 'Anthropic',
    baseUrl: 'https://claude.ai/new',
    queryParam: 'q',
    maxUrlLength: DEFAULT_MAX_URL_LENGTH,
    buildUrl(encodedPrompt) {
      return `https://claude.ai/new?q=${encodedPrompt}`;
    },
    buildShortPrompt({ scopeTitle, scopeType, courseTitle }) {
      return `I copied my course context. Paste it below, then help me with: ${scopeTitle} (${scopeType}) from course "${courseTitle}".`;
    },
  },
};

/**
 * Returns a list of configured AI platforms for easy iteration in UI.
 */
export function getAiPlatformList() {
  return Object.values(AI_PLATFORMS);
}

/**
 * Resolves platform by ID with safe fallback.
 */
export function getAiPlatform(id) {
  return AI_PLATFORMS[id] || AI_PLATFORMS.chatgpt;
}

