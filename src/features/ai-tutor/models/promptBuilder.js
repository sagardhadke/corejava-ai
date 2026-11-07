/**
 * AI Tutor Prompt Builder & URL Parameter Formatter
 *
 * Builds structured prompts for ChatGPT and Claude.
 * Supports:
 * - Multi-lecture selection (1 to N lectures)
 * - Multi-section selection (1 to N sections)
 * - Focused Markdown context (compact, fits in deep links)
 * - Complete course context
 * - Input sanitization against instruction injection and delimiter breakout
 */

import { DEFAULT_MAX_URL_LENGTH } from './aiPlatforms.js';
import { courseToXml } from './courseXmlSerializer.js';

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
    // Neutralize markdown code fences so they cannot break the prompt structure
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
 * Builds a focused, compact Markdown syllabus roadmap.
 * Contains the selected topics in full detail and a high-level table
 * of other sections so the AI understands curriculum context without 15KB of XML.
 */
export function buildFocusedRoadmap(course, selectedLectures = [], selectedSections = []) {
  const sections = Array.isArray(course?.sections) ? course.sections : [];
  const selectedLecIds = new Set(selectedLectures.map((l) => (typeof l === 'string' ? l : l.id)));
  const selectedSecIds = new Set(selectedSections.map((s) => (typeof s === 'string' ? s : s.id)));

  const outline = sections.map((sec) => {
    const sNum = sec.number || '??';
    const isTargetSec = selectedSecIds.has(sec.id);
    const hasTargetLecs = (sec.lectures || []).some((l) => selectedLecIds.has(l.id));
    const flag = isTargetSec ? ' [SELECTED SECTION]' : (hasTargetLecs ? ' [HAS SELECTED TOPICS]' : '');
    return `- Sec ${sNum}: ${sec.title} (${sec.lectures?.length || 0} lectures)${flag}`;
  }).join('\n');

  return outline;
}

/**
 * Builds the complete prompt for the AI Tutor.
 * Supports:
 * - scopeType: 'multi-lecture' | 'multi-section' | 'full-course' | 'topic' | 'section'
 * - contextMode: 'focused' (compact Markdown, fits deep link) | 'full' (complete XML)
 */
export function buildFullPrompt({
  course,
  scopeType = 'topic',
  section,
  lecture,
  selectedLectures = [],
  selectedSections = [],
  contextMode = 'focused',
} = {}) {
  const courseTitle = sanitizeText(course?.title || 'Course');

  // Normalize single selections to multi arrays if passed
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
    scopeDetails = `Overview of all ${(course?.sections || []).length} sections and total course structure.`;
  } else {
    // Multi-lecture / topic mode
    const lecCount = effectiveLectures.length || 1;
    targetSummary = effectiveLectures.map((l) => l.title || 'Topic').join(', ');
    scopeHeading = `Scope: ${lecCount} Selected Course Lecture(s)`;

    const lecLines = effectiveLectures.map((l, idx) => {
      const title = sanitizeText(l.title || 'Lecture');
      const dur = sanitizeText(l.durationLabel || '');
      const secNum = l.sectionNumber ? ` [Sec ${l.sectionNumber}]` : '';
      return `  ${idx + 1}. "${title}"${dur ? ` (${dur})` : ''}${secNum}`;
    }).join('\n');

    scopeDetails = `Selected Lectures:\n${lecLines}`;
  }

  // Generate context block based on mode
  let contextBlock = '';
  if (contextMode === 'focused') {
    const roadmap = buildFocusedRoadmap(course, effectiveLectures, effectiveSections);
    contextBlock = [
      'Course Curriculum Roadmap (High-Level Overview):',
      roadmap,
    ].join('\n');
  } else {
    // Full XML context mode
    const rawXml = courseToXml(course);
    const xml = sanitizeXml(rawXml);
    contextBlock = [
      'Complete Course XML Structure:',
      '```xml',
      xml,
      '```',
    ].join('\n');
  }

  return [
    `You are an expert AI tutor for the course "${courseTitle}".`,
    '',
    `I am currently studying this curriculum and need your help with:`,
    scopeHeading,
    scopeDetails,
    '',
    contextBlock,
    '',
    'Instructions for the tutor:',
    `1. Provide clear, comprehensive explanations covering: ${targetSummary}.`,
    '2. Explain key concepts with practical examples, code snippets, and real-world use cases.',
    '3. Point out common pitfalls, best practices, and connections to related course sections.',
    '4. After explaining, offer follow-up questions, quick quizzes, or hands-on practice ideas.',
  ].join('\n');
}

/**
 * Builds a concise prefilled prompt for deep links when the prompt
 * exceeds URL limits or requires clipboard pasting.
 */
export function buildShortPrompt({
  platform,
  course,
  scopeType = 'topic',
  section,
  lecture,
  selectedLectures = [],
  selectedSections = [],
} = {}) {
  const courseTitle = sanitizeText(course?.title || 'Course');
  let targetName = '';

  if (selectedLectures.length > 1) {
    targetName = `${selectedLectures.length} selected lectures (${selectedLectures.slice(0, 2).map((l) => l.title).join(', ')}...)`;
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

  return `I have attached/copied my course context. Please help me with: ${targetName} from "${courseTitle}".`;
}

/**
 * Calculates the exact character length of a URL with the prompt URL-encoded.
 */
export function calculateUrlLength(baseUrl, queryParam, prompt) {
  const encoded = encodeURIComponent(prompt || '');
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${queryParam}=${encoded}`.length;
}

/**
 * Prepares the launch configuration for a given platform.
 */
export function preparePlatformUrl({
  platform,
  course,
  scopeType = 'topic',
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
