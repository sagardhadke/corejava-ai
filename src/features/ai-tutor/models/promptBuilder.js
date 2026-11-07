/**
 * Pure Prompt Builder & URL Preparation Utility
 *
 * Formats structured prompts for AI tutors (ChatGPT / Claude) with full course
 * XML context, calculates encoded URL lengths against safe thresholds, and
 * prepares fallback short prompts when limits are exceeded.
 */

import { DEFAULT_MAX_URL_LENGTH } from './aiPlatforms.js';
import { courseToXml } from './courseXmlSerializer.js';

/**
 * Sanitizes user-provided or imported strings against prompt injection,
 * malicious HTML tags, and markdown code fence breakouts.
 */
export function sanitizeText(text) {
  if (text == null) return '';
  return String(text)
    // Strip ASCII control characters (keep newline \n and tab \t)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Strip dangerous HTML tags
    .replace(/<\/?(?:script|iframe|object|embed|style|applet|form)[^>]*>/gi, '')
    // Escape markdown backticks to prevent fence breakouts
    .replace(/```/g, "'''")
    .trim();
}

/**
 * Sanitizes XML text for inclusion within a markdown code block.
 */
export function sanitizeXmlForPrompt(xml) {
  if (!xml) return '';
  return String(xml)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/```/g, "'''")
    .trim();
}

/**
 * Builds the full prompt containing role instructions, selected scope,
 * and the complete course XML for deep syllabus context.
 *
 * @param {Object} params
 * @param {Object} params.course - Active course object
 * @param {'topic'|'section'} params.scopeType - 'topic' (lecture) or 'section'
 * @param {Object} [params.section] - Selected section object
 * @param {Object} [params.lecture] - Selected lecture object (when scopeType is 'topic')
 * @param {string} [params.customXml] - Optional raw XML override
 * @returns {string} The full prompt ready to send or copy
 */
export function buildFullPrompt({ course, scopeType = 'topic', section, lecture, customXml } = {}) {
  const courseTitle = sanitizeText(course?.title || 'Course');
  const xml = sanitizeXmlForPrompt(customXml || courseToXml(course));

  let scopeHeading = '';
  let scopeDetails = '';
  let targetName = '';

  if (scopeType === 'section' && section) {
    const secNum = sanitizeText(section.number || '01');
    const secTitle = sanitizeText(section.title || 'Section');
    targetName = `Section ${secNum}: ${secTitle}`;
    scopeHeading = `Scope: Entire Section — ${targetName}`;

    const lectureList = Array.isArray(section.lectures)
      ? section.lectures
          .map((l, i) => `   ${i + 1}. ${sanitizeText(l.title)} (${sanitizeText(l.durationLabel || '')})`)
          .join('\n')
      : '   (No individual lectures)';

    scopeDetails = [
      `- Section Number: ${secNum}`,
      `- Section Title: "${secTitle}"`,
      `- Total Lectures in Section: ${section.lectures?.length || 0}`,
      `- Topics Covered:`,
      lectureList,
    ].join('\n');
  } else {
    // Default to 'topic' (lecture)
    const secNum = sanitizeText(section?.number || '01');
    const secTitle = sanitizeText(section?.title || 'Section');
    const lecTitle = sanitizeText(lecture?.title || 'General Course Topic');
    const duration = sanitizeText(lecture?.durationLabel || '');
    targetName = lecTitle;
    scopeHeading = `Scope: Single Topic / Lecture — "${lecTitle}"`;

    scopeDetails = [
      `- Topic / Lecture Title: "${lecTitle}"`,
      `- Belongs to Section: ${secNum} — "${secTitle}"`,
      duration ? `- Lecture Duration: ${duration}` : null,
    ].filter(Boolean).join('\n');
  }

  return [
    `You are an expert AI tutor for the course "${courseTitle}".`,
    '',
    `I am currently studying this course and need your help with the following ${scopeType}:`,
    scopeHeading,
    scopeDetails,
    '',
    'Below is the complete course curriculum structure in XML format to provide full context on what came before, what comes after, and how this fits into the overall syllabus:',
    '',
    '```xml',
    xml,
    '```',
    '',
    'Instructions for the tutor:',
    `1. Provide a clear, comprehensive, and intuitive explanation of "${targetName}".`,
    '2. Explain the core fundamentals, practical real-world use cases, and give practical code examples.',
    '3. Relate this topic to prerequisite concepts and explain how it prepares me for subsequent sections in the course syllabus provided above.',
    '4. After your explanation, stop and ask if I would like a deep-dive, practice exercises, or interview questions on this topic.',
  ].join('\n');
}

/**
 * Builds a concise prefilled prompt for deep links when the full prompt
 * exceeds safe URL length thresholds. Instructs the AI that full context was copied.
 */
export function buildShortPrompt({ platform, course, scopeType = 'topic', section, lecture } = {}) {
  const courseTitle = sanitizeText(course?.title || 'Course');
  let targetName = '';

  if (scopeType === 'section' && section) {
    const secNum = sanitizeText(section.number || '01');
    const secTitle = sanitizeText(section.title || 'Section');
    targetName = `Section ${secNum} (${secTitle})`;
  } else {
    targetName = sanitizeText(lecture?.title || 'Course Topic');
  }

  if (platform?.buildShortPrompt) {
    return platform.buildShortPrompt({
      scopeTitle: targetName,
      scopeType: scopeType === 'section' ? 'section' : 'topic',
      courseTitle,
    });
  }

  return `I copied my full course context to the clipboard. Paste it below, then help me understand: ${targetName} (${scopeType}) from "${courseTitle}".`;
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
 * Determines whether the full prompt fits under the safe threshold,
 * or whether the hybrid clipboard fallback should be activated.
 *
 * @param {Object} params
 * @param {Object} params.platform - AI platform configuration
 * @param {Object} params.course - Active course
 * @param {'topic'|'section'} params.scopeType
 * @param {Object} [params.section]
 * @param {Object} [params.lecture]
 * @param {number} [params.maxUrlLength] - Custom threshold override
 * @returns {Object} Launch plan
 */
export function preparePlatformUrl({
  platform,
  course,
  scopeType = 'topic',
  section,
  lecture,
  maxUrlLength,
} = {}) {
  if (!platform) {
    throw new Error('Platform configuration is required.');
  }

  const threshold = typeof maxUrlLength === 'number'
    ? maxUrlLength
    : (platform.maxUrlLength || DEFAULT_MAX_URL_LENGTH);

  const fullPrompt = buildFullPrompt({ course, scopeType, section, lecture });
  const shortPrompt = buildShortPrompt({ platform, course, scopeType, section, lecture });

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
  };
}

