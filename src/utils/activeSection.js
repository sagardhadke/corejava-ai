/**
 * Determines which section should be considered "active" (and opened by default).
 * The active section is the first section containing at least one unwatched lecture.
 * If all lectures across the course are completed, falls back to the last section.
 *
 * @param {Object} course The course object containing sections and lectures
 * @param {Set<string>} watchedSet Set of watched lecture IDs
 * @returns {string|null} The id of the active section
 */
export function getActiveSectionId(course, watchedSet = new Set()) {
  if (!course?.sections?.length) return null;
  const sectionWithUnwatched = course.sections.find((s) =>
    s.lectures && s.lectures.some((l) => !watchedSet.has(l.id))
  );
  if (sectionWithUnwatched) return sectionWithUnwatched.id;

  const lastSection = course.sections[course.sections.length - 1];
  return lastSection?.id || course.sections[0]?.id || null;
}
