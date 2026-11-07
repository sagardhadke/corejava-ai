/**
 * Course XML Serializer & Downloader
 *
 * Converts internal course objects into standardized, valid course XML strings
 * matching the schema used by Learnyst and our xmlCourseParser.js.
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
 *
 * @param {Object} course Course object with title and sections
 * @returns {string} XML string
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
 * Triggers a client-side browser download of the course XML file.
 *
 * @param {Object} course The course object to export
 * @returns {string} The filename that was downloaded
 */
export function downloadCourseXml(course) {
  const xmlContent = courseToXml(course);
  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const safeTitle = (course?.title || 'course')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'course';

  const filename = `${safeTitle}-structure.xml`;
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return filename;
}

