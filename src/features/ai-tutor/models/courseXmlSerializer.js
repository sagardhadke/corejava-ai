/**
 * Course Syllabus Serializers & Context File Exporters
 *
 * Provides serialization for:
 * 1. Markdown (.md) — AI-native format optimized for ChatGPT, Claude, & Gemini attachments.
 * 2. Plain Text (.txt) — Universal text syllabus.
 * 3. XML (.xml) — Canonical Learnyst-compatible course structure.
 */

/**
 * Escapes characters for safe inclusion inside XML attributes and text nodes.
 */
export function escapeXml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Serializes a course object to standard XML format.
 */
export function courseToXml(course) {
  if (!course) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n<course>\n  <title>Course</title>\n  <sections/>\n</course>';
  }

  const title = escapeXml(course.title || 'Untitled Course');
  const sections = Array.isArray(course.sections) ? course.sections : [];

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<course>',
    `  <title>${title}</title>`,
    '  <sections>',
  ];

  sections.forEach((sec, idx) => {
    const rawNum = sec.number || String(idx + 1).padStart(2, '0');
    const secNum = escapeXml(rawNum);
    const secTitle = escapeXml(sec.title || `Section ${secNum}`);
    const isProjectAttr = sec.isProject ? ' project="true"' : '';

    lines.push(`    <section number="${secNum}" title="${secTitle}"${isProjectAttr}>`);
    lines.push('      <items>');

    const lectures = Array.isArray(sec.lectures) ? sec.lectures : [];
    lectures.forEach((lec, lIdx) => {
      const lecTitle = escapeXml(lec.title || `Lecture ${lIdx + 1}`);
      const duration = escapeXml(lec.durationLabel || (lec.durationSec ? `${Math.round(lec.durationSec / 60)}m` : '0m'));
      lines.push(`        <item type="video" title="${lecTitle}" duration="${duration}" />`);
    });

    lines.push('      </items>');
    lines.push('    </section>');
  });

  lines.push('  </sections>');
  lines.push('</course>');

  return lines.join('\n');
}

/**
 * Serializes a course to a clean, senior-level Markdown document.
 * This is the optimal document format for uploading or attaching into
 * ChatGPT or Claude web chats.
 */
export function courseToMarkdown(course, { selectedLectures = [], selectedSections = [] } = {}) {
  if (!course) return '# Course Syllabus\n\nNo course content loaded.\n';

  const title = course.title || 'Course Syllabus';
  const sections = Array.isArray(course.sections) ? course.sections : [];
  const selectedLecIds = new Set(selectedLectures.map((l) => (typeof l === 'string' ? l : l.id)));
  const selectedSecIds = new Set(selectedSections.map((s) => (typeof s === 'string' ? s : s.id)));

  const lines = [
    `# Course Context: ${title}`,
    '',
    '> **Note for AI Tutor**: This document contains the course syllabus context.',
    '> Please use it to understand topic depth, sequence, prerequisites, and learning path.',
    '',
  ];

  if (selectedLecIds.size > 0) {
    lines.push('## ⭐ Selected Focus Topics for Current Session');
    selectedLectures.forEach((lec, i) => {
      const lTitle = typeof lec === 'string' ? lec : (lec.title || 'Lecture');
      const dur = typeof lec === 'object' && lec.durationLabel ? ` (${lec.durationLabel})` : '';
      lines.push(`${i + 1}. **${lTitle}**${dur}`);
    });
    lines.push('');
  } else if (selectedSecIds.size > 0) {
    lines.push('## ⭐ Selected Focus Sections for Current Session');
    selectedSections.forEach((sec, i) => {
      const sTitle = typeof sec === 'string' ? sec : `Section ${sec.number || ''}: ${sec.title || ''}`;
      lines.push(`${i + 1}. **${sTitle}**`);
    });
    lines.push('');
  }

  lines.push('## Full Curriculum Roadmap');
  lines.push('');

  sections.forEach((sec, sIdx) => {
    const sNum = sec.number || String(sIdx + 1).padStart(2, '0');
    const isTargetSection = selectedSecIds.has(sec.id);
    const badge = isTargetSection ? ' [★ TARGET SECTION]' : (sec.isProject ? ' [PROJECT]' : '');
    lines.push(`### Section ${sNum}: ${sec.title}${badge}`);
    lines.push('');

    const lectures = Array.isArray(sec.lectures) ? sec.lectures : [];
    lectures.forEach((lec, lIdx) => {
      const isTargetLec = selectedLecIds.has(lec.id);
      const mark = isTargetLec ? '👉 ' : '- ';
      const dur = lec.durationLabel ? ` (${lec.durationLabel})` : '';
      lines.push(`${mark}Lecture ${lIdx + 1}: ${lec.title}${dur}${isTargetLec ? ' **[SELECTED]**' : ''}`);
    });
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Triggers a client-side browser download of the course XML file.
 */
export function downloadCourseXml(course) {
  const xmlContent = courseToXml(course);
  return triggerDownload(xmlContent, course?.title, 'structure.xml', 'application/xml;charset=utf-8;');
}

/**
 * Triggers a client-side browser download of the course Markdown context file (.md).
 * Perfect for dragging and dropping directly into ChatGPT or Claude.
 */
export function downloadCourseContextFile(course, { selectedLectures = [], selectedSections = [], format = 'markdown' } = {}) {
  let content = '';
  let ext = 'context.md';
  let mime = 'text/markdown;charset=utf-8;';

  if (format === 'xml') {
    content = courseToXml(course);
    ext = 'syllabus.xml';
    mime = 'application/xml;charset=utf-8;';
  } else if (format === 'txt') {
    content = courseToMarkdown(course, { selectedLectures, selectedSections });
    ext = 'context.txt';
    mime = 'text/plain;charset=utf-8;';
  } else {
    // Default: Markdown (.md)
    content = courseToMarkdown(course, { selectedLectures, selectedSections });
    ext = 'context.md';
    mime = 'text/markdown;charset=utf-8;';
  }

  return triggerDownload(content, course?.title, ext, mime);
}

function triggerDownload(content, title, ext, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const safeTitle = (title || 'course')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'course';

  const filename = `${safeTitle}-${ext}`;
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return filename;
}
