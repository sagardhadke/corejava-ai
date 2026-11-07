export { default as AiTutorModal } from './views/AiTutorModal.jsx';
export { AI_PLATFORMS, getAiPlatformList, getAiPlatform, DEFAULT_MAX_URL_LENGTH } from './models/aiPlatforms.js';
export { buildFullPrompt, buildShortPrompt, preparePlatformUrl, calculateUrlLength } from './models/promptBuilder.js';
export { copyToClipboard } from './models/clipboard.js';
export { courseToXml, downloadCourseXml } from './models/courseXmlSerializer.js';

