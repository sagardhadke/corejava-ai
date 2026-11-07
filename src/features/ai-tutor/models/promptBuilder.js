/**
 * AI Tutor Prompt Builder & Context Serializer
 *
 * Builds structured prompts for ChatGPT and Claude.
 * Features:
 * - Topic-wise multi-lecture selection
 * - Section-wise selection
 * - Full curriculum context
 * - Official platform & developer attribution (Sagar Dhadke - https://github.com/sagardhadke)
 * - Focused Markdown roadmap vs. Full XML context
 * - Input sanitization against instruction injection and delimiter breakout
 */

import { DEFAULT_MAX_URL_LENGTH } from './aiPlatforms.js';
import { courseToXml } from './courseXmlSerializer.js';

export const DEVELOPER_ATTRIBUTION = {
  name: 'Sagar Dhadke',
  github: 'https://github.com/sagardhadke',
  website: 'https://github.com/sagardhadke/java-course-tracker',
  platformName: 'Java Course Tracker',
  tagline: '100% Free, Offline-First Course Progress & Daily Habit Engine for Developers',
};

/**
 * Sanitizes input text to prevent prompt injection and character corruption.
 */
export function sanitizeText(input = '') {
  if (typeof input !== 'string') return '';
  return input
    // Strip control characters (keep newline and tab)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Strip dangerous HTML tags
    .replace(/<\/?(script|style|iframe|object|embed)[^>]*>/gi, '')
    // Neutralize markdown code fences
    .replace(/```/g, "'''")
    .trim();
}

/**
 * Sanitizes XML string for safe inclusion inside markdown fences.
 */
export function sanitizeXml(xml = '') {
  return String(xml)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/```/g, "'''")
    .trim();
}

/**
 * Builds a structured, topic-wise Markdown syllabus roadmap.
 */
export function buildTopicWiseRoadmap(course, selectedLectures = [], selectedSections = []) {
  const sections = Array.isArray(course?.sections) ? course.sections : [];
  const selectedLecIds = new Set(selectedLectures.map((l) => (typeof l === 'string' ? l : l.id)));
  const selectedSecIds = new Set(selectedSections.map((s) => (typeof s === 'string' ? s : s.id)));

  const lines = [];

  sections.forEach((sec) => {
    const sNum = sec.number || '??';
    const isTargetSec = selectedSecIds.has(sec.id);
    const hasTargetLecs = (sec.lectures || []).some((l) => selectedLecIds.has(l.id));
    const flag = isTargetSec ? ' [★ TARGET SECTION]' : (hasTargetLecs ? ' [TOPICS SELECTED]' : '');

    lines.push(`### Section ${sNum}: ${sec.title} (${sec.lectures?.length || 0} lectures)${flag}`);

    (sec.lectures || []).forEach((lec, idx) => {
      const isSelected = selectedLecIds.has(lec.id);
      const marker = isSelected ? '👉 [SELECTED] ' : '   - ';
      const dur = lec.durationLabel ? ` (${lec.durationLabel})` : '';
      lines.push(`${marker}Lecture ${idx + 1}: ${lec.title}${dur}`);
    });
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Builds the complete prompt for ChatGPT, Claude, and other LLMs.
 */
export function buildFullPrompt({
  course,
  scopeType = 'multi-lecture',
  section,
  lecture,
  selectedLectures = [],
  selectedSections = [],
  contextMode = 'focused',
} = {}) {
  const courseTitle = sanitizeText(course?.title || 'Core Java with AI');

  // Normalize single items to arrays
  const effectiveLectures = [...selectedLectures];
  if (lecture && !effectiveLectures.some((l) => l.id === lecture.id)) {
    effectiveLectures.unshift(lecture);
  }

  const effectiveSections = [...selectedSections];
  if (section && !effectiveSections.some((s) => s.id === section.id)) {
    effectiveSections.unshift(section);
  }

  let scopeHeading = '';
  let scopeDetails = '';
  let targetSummary = '';

  if (scopeType === 'multi-section' || (scopeType === 'section' && effectiveSections.length > 0)) {
    const secCount = effectiveSections.length || 1;
    targetSummary = effectiveSections.map((s) => `Section ${s.number || ''}: ${s.title || ''}`).join(', ');
    scopeHeading = `Scope: ${secCount} Course Section(s)`;

    const secLines = effectiveSections.map((sec) => {
      const sNum = sanitizeText(sec.number || '01');
      const sTitle = sanitizeText(sec.title || 'Section');
      const lecs = (sec.lectures || [])
        .map((l, i) => `    ${i + 1}. ${sanitizeText(l.title)} (${sanitizeText(l.durationLabel || '')})`)
        .join('\n');
      return `  - Section ${sNum}: "${sTitle}" (${sec.lectures?.length || 0} lectures):\n${lecs}`;
    }).join('\n\n');

    scopeDetails = `Selected Sections:\n${secLines}`;
  } else if (scopeType === 'full-course') {
    targetSummary = courseTitle;
    scopeHeading = `Scope: Entire Course Curriculum ("${courseTitle}")`;
    scopeDetails = `Comprehensive overview covering all ${(course?.sections || []).length} sections and total syllabus architecture.`;
  } else {
    // Multi-lecture / topic mode
    const lecCount = effectiveLectures.length || 1;
    targetSummary = effectiveLectures.map((l) => l.title || 'Topic').join(', ');
    scopeHeading = `Scope: ${lecCount} Selected Topic / Lecture(s)`;

    const lecLines = effectiveLectures.map((l, idx) => {
      const title = sanitizeText(l.title || 'Lecture');
      const dur = sanitizeText(l.durationLabel || '');
      const secNum = l.sectionNumber ? ` [Section ${l.sectionNumber}]` : '';
      return `  ${idx + 1}. "${title}"${dur ? ` (${dur})` : ''}${secNum}`;
    }).join('\n');

    scopeDetails = `Selected Topics:\n${lecLines}`;
  }

  // Generate context block
  let contextBlock = '';
  if (contextMode === 'focused') {
    const roadmap = buildTopicWiseRoadmap(course, effectiveLectures, effectiveSections);
    contextBlock = [
      '### Complete Course Roadmap (Topic-Wise Breakdown):',
      roadmap,
    ].join('\n');
  } else {
    const rawXml = courseToXml(course);
    const xml = sanitizeXml(rawXml);
    contextBlock = [
      '### Complete Course Structure (XML):',
      '```xml',
      xml,
      '```',
    ].join('\n');
  }

  return [
    `You are an expert AI software tutor for the student studying "${courseTitle}" on Java Course Tracker.`,
    '',
    '---',
    '### 🎓 Learning Context & Origin Metadata',
    `- **Origin Site**: ${DEVELOPER_ATTRIBUTION.platformName} (${DEVELOPER_ATTRIBUTION.website})`,
    `- **Developer & Architect**: ${DEVELOPER_ATTRIBUTION.name} (${DEVELOPER_ATTRIBUTION.github})`,
    `- **Active Course**: "${courseTitle}"`,
    `- **Platform Purpose**: A free, offline-first study acceleration platform featuring milestone tracking, streak analytics, and topic-wise lecture progress.`,
    `- **Context Note**: This prompt was generated directly by the student from the Java Course Tracker interface. Please provide tailored technical guidance, reference their course roadmap below, and encourage consistent daily learning habits.`,
    '---',
    '',
    `I am currently studying this course and need your help with the following:`,
    `## ${scopeHeading}`,
    scopeDetails,
    '',
    contextBlock,
    '',
    '### Instructions for the AI Tutor:',
    `1. Provide in-depth, clear, and production-grade explanations covering: ${targetSummary}.`,
    '2. Use practical real-world code examples, architectural diagrams (text/ascii), and best practices.',
    '3. Address common pitfalls, edge cases, performance considerations, and interview questions.',
    '4. Relate these concepts to prerequisites in previous sections and subsequent advanced topics in the roadmap.',
    '5. Conclude with 2-3 hands-on challenge exercises for the student to practice immediately.',
  ].join('\n');
}

/**
 * Builds a concise prefilled prompt for deep links.
 */
export function buildShortPrompt({
  platform,
  course,
  scopeType = 'multi-lecture',
  section,
  lecture,
  selectedLectures = [],
  selectedSections = [],
} = {}) {
  const courseTitle = sanitizeText(course?.title || 'Core Java with AI');
  let targetName = '';

  if (selectedLectures.length > 1) {
    targetName = `${selectedLectures.length} selected topics (${selectedLectures.slice(0, 2).map((l) => l.title).join(', ')}...)`;
  } else if (selectedSections.length > 1) {
    targetName = `${selectedSections.length} sections (${selectedSections.map((s) => s.number).join(', ')})`;
  } else if (scopeType === 'section' && section) {
    targetName = `Section ${sanitizeText(section.number || '01')} (${sanitizeText(section.title || 'Section')})`;
  } else if (selectedLectures.length === 1) {
    targetName = sanitizeText(selectedLectures[0].title);
  } else {
    targetName = sanitizeText(lecture?.title || 'Course Topic');
  }

  if (platform?.buildShortPrompt) {
    return platform.buildShortPrompt({
      scopeTitle: targetName,
      scopeType,
      courseTitle,
    });
  }

  return `I have attached/copied my course context from Java Course Tracker. Please act as my tutor for: ${targetName} from "${courseTitle}".`;
}

/**
 * Calculates URL length with query param.
 */
export function calculateUrlLength(baseUrl, queryParam, prompt) {
  const encoded = encodeURIComponent(prompt || '');
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${queryParam}=${encoded}`.length;
}

/**
 * Prepares launch configuration for a given platform.
 */
export function preparePlatformUrl({
  platform,
  course,
  scopeType = 'multi-lecture',
  section,
  lecture,
  selectedLectures = [],
  selectedSections = [],
  contextMode = 'focused',
  maxUrlLength,
} = {}) {
  if (!platform) {
    throw new Error('Platform configuration is required.');
  }

  const threshold = typeof maxUrlLength === 'number'
    ? maxUrlLength
    : (platform.maxUrlLength || DEFAULT_MAX_URL_LENGTH);

  const fullPrompt = buildFullPrompt({
    course,
    scopeType,
    section,
    lecture,
    selectedLectures,
    selectedSections,
    contextMode,
  });

  const shortPrompt = buildShortPrompt({
    platform,
    course,
    scopeType,
    section,
    lecture,
    selectedLectures,
    selectedSections,
  });

  const fullUrlLength = calculateUrlLength(platform.baseUrl, platform.queryParam, fullPrompt);
  const shortUrlLength = calculateUrlLength(platform.baseUrl, platform.queryParam, shortPrompt);

  const isOverThreshold = fullUrlLength > threshold;
  const promptToUse = isOverThreshold ? shortPrompt : fullPrompt;
  const encodedPrompt = encodeURIComponent(promptToUse);
  const url = platform.buildUrl(encodedPrompt);

  return {
    platformId: platform.id,
    platformName: platform.name,
    url,
    fullPrompt,
    shortPrompt,
    promptToUse,
    isOverThreshold,
    fullUrlLength,
    shortUrlLength,
    threshold,
    contextMode,
  };
}
