/**
 * Determines which section should be considered the primary "active" section.
 * The active section is the first section containing at least one unwatched lecture.
 * If all lectures across the course are completed, falls back to the last section.
 *
 * @param {Object} course The course object containing sections and lectures
 * @param {Set<string>} watchedSet Set of watched lecture IDs
 * @returns {string|null} The id of the primary active section
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

/**
 * Determines all sections that should be considered active and automatically expanded.
 * A section is active if:
 * 1. It contains lectures in today's plan (indicated by the active yellow dot).
 * 2. It is the primary unwatched progress section (first section with unwatched lectures).
 *
 * Fully completed sections without today's plan are excluded.
 *
 * @param {Object} course The course object containing sections and lectures
 * @param {Set<string>} watchedSet Set of watched lecture IDs
 * @param {Set<string>} planSet Set of today's planned lecture IDs
 * @returns {string[]} Array of active section IDs
 */
export function getActiveSectionIds(course, watchedSet = new Set(), planSet = new Set()) {
  if (!course?.sections?.length) return [];

  const activeIds = new Set();

  // 1. Every section that has lectures in today's plan (has the active yellow dot)
  course.sections.forEach((s) => {
    if (s.lectures && s.lectures.some((l) => planSet.has(l.id))) {
      activeIds.add(s.id);
    }
  });

  // 2. The primary active section (first section with at least one unwatched lecture)
  const primaryUnwatched = course.sections.find((s) =>
    s.lectures && s.lectures.some((l) => !watchedSet.has(l.id))
  );
  if (primaryUnwatched) {
    activeIds.add(primaryUnwatched.id);
  } else if (activeIds.size === 0) {
    const lastSection = course.sections[course.sections.length - 1];
    if (lastSection?.id) activeIds.add(lastSection.id);
  }

  return Array.from(activeIds);
}
