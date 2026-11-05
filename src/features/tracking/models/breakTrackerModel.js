/**
 * Break Tracker & Consistency Analysis Domain Model (Pure Domain Logic)
 * 100% local — analyzes local daily logs and history to detect break intervals,
 * inactivity gaps, study consistency ratios, and calculate break-adjusted completion dates.
 */

function toLocalDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseLocalDate(dateStr) {
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d, n) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

/**
 * Analyzes all calendar days from course start up to today to identify
 * study days, break days, and all discrete break intervals.
 *
 * @param {object} params
 * @param {object} params.dailyLog - tracking daily log map
 * @param {object} params.history - course progress history map
 * @param {string} params.startDate - YYYY-MM-DD
 * @param {string} params.today - YYYY-MM-DD
 * @returns {object} Comprehensive break and consistency analysis
 */
export function analyzeCourseBreaks({ dailyLog = {}, history = {}, startDate, today }) {
  const todayKey = today || toLocalDateKey(new Date());

  // Determine starting anchor date
  let startKey = startDate;
  if (!startKey) {
    const allLoggedDates = Object.keys(dailyLog).filter((k) => dailyLog[k]?.totalSec > 0).sort();
    const allHistoryDates = Object.keys(history).filter((k) => history[k]?.watchedSec > 0 || history[k]?.isPractice).sort();
    const combined = [...allLoggedDates, ...allHistoryDates].sort();
    startKey = combined[0] || todayKey;
  }

  // If start is after today (edge case), clamp to today
  if (startKey > todayKey) {
    startKey = todayKey;
  }

  const startObj = parseLocalDate(startKey);
  const todayObj = parseLocalDate(todayKey);

  const diffTime = todayObj.getTime() - startObj.getTime();
  const totalCalendarDays = Math.max(1, Math.round(diffTime / (1000 * 3600 * 24)) + 1);

  let totalStudyDays = 0;
  let totalBreakDays = 0;
  const breakIntervals = [];

  let currentBreakStart = null;
  let currentBreakCount = 0;

  for (let i = 0; i < totalCalendarDays; i++) {
    const currentDay = addDays(startObj, i);
    const dayKey = toLocalDateKey(currentDay);

    const isStudyDay = (dailyLog[dayKey]?.totalSec > 0) ||
                       (history[dayKey]?.watchedSec > 0) ||
                       (history[dayKey]?.isPractice === true);

    if (isStudyDay) {
      totalStudyDays++;
      // If we were in a break, close it
      if (currentBreakStart) {
        breakIntervals.push({
          startDate: currentBreakStart,
          endDate: toLocalDateKey(addDays(currentDay, -1)),
          durationDays: currentBreakCount,
          resumedOn: dayKey,
        });
        currentBreakStart = null;
        currentBreakCount = 0;
      }
    } else {
      totalBreakDays++;
      if (!currentBreakStart) {
        currentBreakStart = dayKey;
      }
      currentBreakCount++;
    }
  }

  // If user is currently on a break that hasn't closed yet
  let ongoingBreakDays = 0;
  if (currentBreakStart) {
    ongoingBreakDays = currentBreakCount;
    breakIntervals.push({
      startDate: currentBreakStart,
      endDate: todayKey,
      durationDays: currentBreakCount,
      resumedOn: null, // Still ongoing
      isOngoing: true,
    });
  }

  // Longest and average break calculations
  const completedBreaks = breakIntervals.filter((b) => !b.isOngoing);
  const longestBreakDays = breakIntervals.reduce((max, b) => Math.max(max, b.durationDays), 0);
  const avgBreakDays = breakIntervals.length > 0
    ? (totalBreakDays / breakIntervals.length).toFixed(1)
    : '0';

  const consistencyRatio = totalCalendarDays > 0
    ? Number((totalStudyDays / totalCalendarDays).toFixed(2))
    : 1;

  const consistencyPct = Math.round(consistencyRatio * 100);

  const isActiveToday = (dailyLog[todayKey]?.totalSec > 0) || (history[todayKey]?.watchedSec > 0);

  return {
    startKey,
    todayKey,
    totalCalendarDays,
    totalStudyDays,
    totalBreakDays,
    breakIntervals: breakIntervals.reverse(), // Newest breaks first
    longestBreakDays,
    avgBreakDays,
    consistencyRatio,
    consistencyPct,
    ongoingBreakDays,
    isActiveToday,
  };
}

/**
 * Computes both Fast-Track and Realistic completion dates factoring in
 * historical break patterns to give the user exact dates.
 *
 * @param {object} params
 * @param {number} params.remainingSec - seconds left to complete
 * @param {number} params.effectiveVelocity - seconds learned per active study day
 * @param {number} params.consistencyRatio - ratio of study days to total days (0.0 to 1.0)
 * @param {string} params.today - YYYY-MM-DD
 * @returns {object} { fastTrackDays, fastTrackDateStr, realisticDays, realisticDateStr, daysSaved, accelerationAdvice }
 */
export function computeBreakAdjustedETA({
  remainingSec = 0,
  effectiveVelocity = 5400,
  consistencyRatio = 1,
  today,
}) {
  const todayKey = today || toLocalDateKey(new Date());
  const todayObj = parseLocalDate(todayKey);

  if (remainingSec <= 0 || effectiveVelocity <= 0) {
    return {
      fastTrackDays: 0,
      fastTrackDateStr: 'Complete',
      realisticDays: 0,
      realisticDateStr: 'Complete',
      daysSaved: 0,
      accelerationAdvice: 'Congratulations on finishing the course!',
    };
  }

  // Pure active study days required
  const studyDaysNeeded = Math.ceil(remainingSec / effectiveVelocity);

  // Fast-track: assume 0 breaks, studying every single day
  const fastTrackDays = studyDaysNeeded;
  const fastTrackDateObj = addDays(todayObj, fastTrackDays);
  const fastTrackDateStr = fastTrackDateObj.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });

  // Realistic: adjust for historical break frequency
  // Clamp consistency ratio between 0.25 and 1.0 to prevent runaway dates
  const effectiveConsistency = Math.max(0.25, Math.min(1.0, consistencyRatio || 1.0));
  const realisticDays = Math.ceil(studyDaysNeeded / effectiveConsistency);
  const realisticDateObj = addDays(todayObj, realisticDays);
  const realisticDateStr = realisticDateObj.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });

  const daysSaved = Math.max(0, realisticDays - fastTrackDays);

  let accelerationAdvice;
  if (daysSaved === 0 || consistencyRatio >= 0.95) {
    accelerationAdvice = `🔥 Outstanding consistency! At your daily pace, you are on track to finish by ${fastTrackDateStr}.`;
  } else if (daysSaved <= 5) {
    accelerationAdvice = `⚡ Reduce break days to finish ${daysSaved} days earlier on ${fastTrackDateStr}!`;
  } else {
    accelerationAdvice = `🚀 Fast-Track Opportunity: You can save ${daysSaved} calendar days and finish by ${fastTrackDateStr} (instead of ${realisticDateStr}) by minimizing study breaks!`;
  }

  return {
    studyDaysNeeded,
    fastTrackDays,
    fastTrackDateStr,
    realisticDays,
    realisticDateStr,
    daysSaved,
    accelerationAdvice,
  };
}

/**
 * Extracts and flattens all watched lecture entries across all days into
 * a reverse-chronological content viewed log with exact timestamps.
 *
 * @param {object} dailyLog
 * @returns {Array} List of viewed content entries with formatted times
 */
export function getDetailedContentLog(dailyLog = {}) {
  const result = [];
  const sortedDates = Object.keys(dailyLog).sort().reverse();

  sortedDates.forEach((dateKey) => {
    const bucket = dailyLog[dateKey] || {};
    const entries = bucket.entries || [];
    entries.forEach((entry) => {
      let formattedTime = '';
      if (entry.viewedAt) {
        try {
          const d = new Date(entry.viewedAt);
          formattedTime = d.toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });
        } catch {
          formattedTime = '';
        }
      }

      result.push({
        ...entry,
        dateKey,
        formattedTime,
        formattedDate: parseLocalDate(dateKey).toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
      });
    });
  });

  return result;
}
