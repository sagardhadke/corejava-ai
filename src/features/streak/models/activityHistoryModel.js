import { formatDuration } from '../../../utils/time.js';

/**
 * Aggregates study activity history across all registered courses.
 * Resolves each entry with course title, lecture number, title, and duration.
 */
export function getAggregatedHistory(courses = [], activeCourse = null, activeHistory = {}) {
  const merged = {};

  const courseList = Array.isArray(courses) && courses.length > 0 ? courses : (activeCourse ? [activeCourse] : []);

  courseList.forEach((c) => {
    try {
      const isCurrentActive = activeCourse && c.id === activeCourse.id;
      const raw = localStorage.getItem(`jct_history__${c.id}`);
      const courseHistory = isCurrentActive && activeHistory ? activeHistory : (raw ? JSON.parse(raw) : {});
      if (!courseHistory || typeof courseHistory !== 'object') return;

      Object.entries(courseHistory).forEach(([dateKey, bucket]) => {
        if (!bucket || typeof bucket !== 'object') return;

        if (!merged[dateKey]) {
          merged[dateKey] = {
            watchedSec: 0,
            watchedCount: 0,
            lectureIds: [],
            entries: [],
            isPractice: false,
            practiceNote: '',
          };
        }

        merged[dateKey].watchedSec += bucket.watchedSec || 0;
        merged[dateKey].watchedCount += bucket.watchedCount || 0;

        if (bucket.isPractice) {
          merged[dateKey].isPractice = true;
          merged[dateKey].practiceNote = bucket.practiceNote || merged[dateKey].practiceNote;
        }

        if (Array.isArray(bucket.entries) && bucket.entries.length > 0) {
          bucket.entries.forEach((e) => {
            const exists = merged[dateKey].entries.some(
              (x) => x.courseId === e.courseId && x.lectureId === e.lectureId
            );
            if (!exists) merged[dateKey].entries.push(e);
          });
        } else if (Array.isArray(bucket.lectureIds)) {
          bucket.lectureIds.forEach((id) => {
            const exists = merged[dateKey].entries.some(
              (x) => x.courseId === c.id && x.lectureId === id
            );
            if (!exists) {
              const lec = c.allLectures?.find((l) => l.id === id);
              const idx = c.allLectures?.findIndex((l) => l.id === id) ?? -1;
              merged[dateKey].entries.push({
                courseId: c.id,
                courseTitle: c.title,
                lectureId: id,
                lectureNumber: idx >= 0 ? idx + 1 : null,
                lectureTitle: lec?.title || id,
                durationSec: lec?.durationSec || 0,
                durationLabel: lec?.durationLabel || (lec?.durationSec ? formatDuration(lec.durationSec) : ''),
              });
            }
          });
        }
      });
    } catch {
      // Ignore unparseable entries
    }
  });

  return merged;
}

export function formatActivityDate(dateKeyStr) {
  if (!dateKeyStr) return '';
  const parts = dateKeyStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
