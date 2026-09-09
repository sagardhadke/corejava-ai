// Parses the course XML format (as used by the Learnyst-style course exports)
// into our internal course shape:
//   { id, title, sections: [{ id, number, title, isProject, lectures: [...] }] }
//
// Runs entirely in the browser via DOMParser, so it works both for the
// bundled default courses (parsed once at build time into JS, see
// defaultCourses.js) and for user-imported XML files at runtime (Settings ->
// Import course).

function parseDurationLabelToSeconds(label) {
  if (!label) return 0;
  let total = 0;
  let matched = false;
  const re = /(\d+)\s*h|(\d+)\s*m|(\d+)\s*s/gi;
  let m;
  while ((m = re.exec(label)) !== null) {
    matched = true;
    if (m[1] !== undefined) total += parseInt(m[1], 10) * 3600;
    else if (m[2] !== undefined) total += parseInt(m[2], 10) * 60;
    else if (m[3] !== undefined) total += parseInt(m[3], 10);
  }
  return matched ? total : 0;
}

// Slugifies a title into a short, stable-ish id fragment for course ids.
function slugify(text, maxLen = 40) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen) || 'course';
}

/**
 * Parses course XML text into our internal course object.
 * Throws a descriptive Error if the XML doesn't look like a valid course file.
 */
export function parseCourseXml(xmlText, { idHint } = {}) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');

  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error('That file is not valid XML: ' + parserError.textContent.slice(0, 200));
  }

  const courseEl = doc.querySelector('course');
  if (!courseEl) {
    throw new Error('This XML does not look like a course file — missing a <course> root element.');
  }

  const titleEl = courseEl.querySelector(':scope > title');
  const title = titleEl ? titleEl.textContent.trim() : 'Imported Course';

  const sectionEls = Array.from(courseEl.querySelectorAll('sections > section'));
  if (sectionEls.length === 0) {
    throw new Error('No <section> elements found — this XML has no course content to import.');
  }

  const courseId = idHint || `course-${slugify(title)}-${Date.now().toString(36)}`;

  const sections = sectionEls.map((sectionEl, sIdx) => {
    const number = sectionEl.getAttribute('number') || String(sIdx + 1).padStart(2, '0');
    const sectionTitle = sectionEl.getAttribute('title') || `Section ${number}`;
    const isProject = sectionEl.getAttribute('project') === 'true'
      || /project/i.test(sectionTitle);

    const itemEls = Array.from(sectionEl.querySelectorAll('items > item'));
    const lectures = [];
    itemEls.forEach((itemEl, iIdx) => {
      const type = itemEl.getAttribute('type');
      if (type !== 'video') return; // only video items count as trackable lectures
      const itemTitle = itemEl.getAttribute('title') || `Lecture ${iIdx + 1}`;
      const durationLabel = itemEl.getAttribute('duration') || '';
      if (!durationLabel) return;
      lectures.push({
        id: `${courseId}__s${number}_l${iIdx}`,
        title: itemTitle,
        durationSec: parseDurationLabelToSeconds(durationLabel),
        durationLabel,
      });
    });

    if (lectures.length === 0) return null;

    return {
      id: `${courseId}__s${number}`,
      number,
      title: sectionTitle,
      isProject,
      lectures,
    };
  }).filter(Boolean);

  if (sections.length === 0) {
    throw new Error('No video lectures with durations were found in this XML — nothing to track.');
  }

  const allLectures = sections.flatMap((s) =>
    s.lectures.map((l) => ({ ...l, sectionId: s.id, sectionTitle: s.title, sectionNumber: s.number }))
  );
  const totalSeconds = allLectures.reduce((sum, l) => sum + l.durationSec, 0);

  return {
    id: courseId,
    title,
    sections,
    allLectures,
    totalSeconds,
    lectureCount: allLectures.length,
  };
}
