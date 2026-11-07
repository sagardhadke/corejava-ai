export { default as AiTutorModal } from './views/AiTutorModal.jsx';
export { default as AiTutorFloatingButton } from './views/AiTutorFloatingButton.jsx';
export { default as ApiKeyManager } from './views/ApiKeyManager.jsx';
export { AI_PLATFORMS, getAiPlatformList, getAiPlatform, DEFAULT_MAX_URL_LENGTH } from './models/aiPlatforms.js';
export {
  DEVELOPER_ATTRIBUTION,
  buildFullPrompt,
  buildShortPrompt,
  preparePlatformUrl,
  calculateUrlLength,
  buildTopicWiseRoadmap,
} from './models/promptBuilder.js';
export { copyToClipboard } from './models/clipboard.js';
export {
  courseToXml,
  courseToMarkdown,
  downloadCourseXml,
  downloadCourseContextFile,
} from './models/courseXmlSerializer.js';
export {
  credentialsRepository,
  CredentialsRepository,
} from './models/credentialsRepository.js';
export {
  MAX_API_KEYS,
  AI_PROVIDERS,
  getStoredApiKeys,
  addApiKey,
  deleteApiKey,
  validateKeyFormat,
  testApiKeyConnection,
  validateStoredKeysDaily,
  maskApiKey,
} from './models/apiKeyStorage.js';
