/**
 * Course Progress Domain Model (Pure Business Logic)
 * Pure domain calculations completely decoupled from React and DOM.
 */

/**
 * Calculates aggregate stats for a course given watched and planned lecture sets.
 */
export function computeCourseStats(allLectures = [], watchedSet = new Set(), planSet = new Set()) {
  const watchedList = allLectures.filter((l) => watchedSet.has(l.id));
  const watchedSec = watchedList.reduce((acc, l) => acc + (l.durationSec || 0), 0);
  const totalSeconds = allLectures.reduce((acc, l) => acc + (l.durationSec || 0), 0);
  const planned = allLectures.filter((l) => planSet.has(l.id));
  const plannedSec = planned.reduce((acc, l) => acc + (l.durationSec || 0), 0);
  const plannedWatchedSec = planned
    .filter((l) => watchedSet.has(l.id))
    .reduce((acc, l) => acc + (l.durationSec || 0), 0);
  const plannedRemainingSec = plannedSec - plannedWatchedSec;

  return {
    watchedCount: watchedList.length,
    totalCount: allLectures.length,
    watchedSec,
    remainingSec: totalSeconds - watchedSec,
    totalSec: totalSeconds,
    pct: allLectures.length ? Math.round((watchedList.length / allLectures.length) * 100) : 0,
    plannedCount: planned.length,
    plannedSec,
    plannedWatchedCount: planned.filter((l) => watchedSet.has(l.id)).length,
    plannedRemainingSec,
    todaySelectedSec: plannedSec,
  };
}

/**
 * Computes per-section progress breakdown.
 */
export function computeSectionProgress(course, watchedSet = new Set()) {
  if (!course || !Array.isArray(course.sections)) return [];
  return course.sections.map((section) => {
    const total = section.lectures?.length || 0;
    const watchedCount = (section.lectures || []).filter((l) => watchedSet.has(l.id)).length;
    const totalSec = (section.lectures || []).reduce((acc, l) => acc + (l.durationSec || 0), 0);
    const watchedSec = (section.lectures || [])
      .filter((l) => watchedSet.has(l.id))
      .reduce((acc, l) => acc + (l.durationSec || 0), 0);
    return {
      sectionId: section.id,
      title: section.title,
      number: section.number,
      watchedCount,
      total,
      remainingSec: totalSec - watchedSec,
      isComplete: total > 0 && watchedCount === total,
    };
  });
}

/**
 * Derives the first date on which at least one lecture was watched.
 */
export function computeFirstWatchedDate(history = {}) {
  const dates = Object.entries(history)
    .filter(([, b]) => (b?.watchedCount > 0 || (Array.isArray(b?.lectureIds) && b.lectureIds.length > 0)))
    .map(([d]) => d)
    .sort();
  return dates[0] || null;
}

/**
 * Resolves the effective start date based on manual overrides, first watched date, or fallback.
 */
export function computeEffectiveStartDate({ isStartDateManual, storedStartDate, firstWatchedDate, today }) {
  if (isStartDateManual && storedStartDate) return storedStartDate;
  if (firstWatchedDate) return firstWatchedDate;
  return storedStartDate || today;
}

/**
 * Builds a fast lookup map of lectureId -> { lecture, globalNumber, sectionId, sectionNumber }
 */
export function buildLectureLookup(course) {
  const map = new Map();
  if (!course || !Array.isArray(course.sections)) return map;

  let globalIndex = 1;
  course.sections.forEach((section) => {
    (section.lectures || []).forEach((lecture) => {
      map.set(lecture.id, {
        lecture,
        globalNumber: globalIndex++,
        sectionId: section.id,
        sectionNumber: section.number,
      });
    });
  });
  return map;
}

/**
 * Filters sections and lectures based on a search query string.
 */
export function filterCourseSections(sections = [], filterQuery = '') {
  const query = filterQuery.trim().toLowerCase();
  if (!query) return sections;

  return sections.reduce((acc, section) => {
    const sectionMatches = section.title.toLowerCase().includes(query);
    const matchingLectures = (section.lectures || []).filter((l) =>
      l.title.toLowerCase().includes(query)
    );

    if (sectionMatches) {
      acc.push(section);
    } else if (matchingLectures.length > 0) {
      acc.push({
        ...section,
        lectures: matchingLectures,
      });
    }
    return acc;
  }, []);
}
