/**
 * Learning Tracker Domain Model (Pure Business Logic)
 * 100% local — no external AI calls. All calculations use localStorage data.
 *
 * Tracks:
 * - Real-time course progress
 * - Daily learning duration
 * - Course content viewed (exact date + time)
 * - How much content was completed each day
 * - Overall course completion speed
 * - Estimated course completion date (ETA)
 * - Daily learning activity logs
 * - Practical learning recommendations
 * - Personalized progress reports
 */

export const TRACKING_VERSION = 'v2';
export const DAILY_LIMIT_SEC = 5 * 3600; // 5 hours in seconds

/** localStorage key namespaced per course */
export function getTrackingKey(courseId) {
  return `jct_tracking__${courseId}_${TRACKING_VERSION}`;
}

/** Default empty tracking store structure */
export function createEmptyTrackingStore() {
  return {
    version: TRACKING_VERSION,
    dailyLog: {},       // { "2026-11-05": { totalSec, lectureCount, limitReached, entries: [...] } }
    velocityEWMA: null, // Exponential weighted moving average of daily learning seconds
    createdAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
  };
}

/** Load tracking store from localStorage */
export function loadTrackingStore(courseId) {
  if (typeof localStorage === 'undefined') return createEmptyTrackingStore();
  try {
    const raw = localStorage.getItem(getTrackingKey(courseId));
    if (!raw) return createEmptyTrackingStore();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return createEmptyTrackingStore();
    return { ...createEmptyTrackingStore(), ...parsed };
  } catch {
    return createEmptyTrackingStore();
  }
}

/** Save tracking store to localStorage */
export function saveTrackingStore(courseId, store) {
  if (typeof localStorage === 'undefined') return;
  try {
    const updated = { ...store, lastUpdatedAt: new Date().toISOString() };
    localStorage.setItem(getTrackingKey(courseId), JSON.stringify(updated));
  } catch {
    // ignore storage quota errors
  }
}

/**
 * Records a lecture as viewed (or un-viewed) in the tracking store.
 * Called whenever a user toggles a lecture's watched state.
 *
 * @param {string} courseId
 * @param {string} dateKey - "YYYY-MM-DD"
 * @param {object} lecture - { id, title, durationSec, durationLabel }
 * @param {boolean} isWatched - true = adding, false = removing
 * @returns {object} updated store
 */
export function recordLectureView(courseId, dateKey, lecture, isWatched) {
  const store = loadTrackingStore(courseId);
  const bucket = store.dailyLog[dateKey] || {
    totalSec: 0,
    lectureCount: 0,
    limitReached: false,
    entries: [],
  };

  const durationSec = lecture?.durationSec || 0;

  if (isWatched) {
    // Add entry if not already present
    const alreadyLogged = bucket.entries.some((e) => e.lectureId === lecture.id);
    if (!alreadyLogged) {
      const entry = {
        lectureId: lecture.id,
        lectureTitle: lecture.title || `Lecture`,
        durationSec,
        viewedAt: new Date().toISOString(),
      };
      bucket.entries = [...(bucket.entries || []), entry];
      bucket.totalSec = (bucket.totalSec || 0) + durationSec;
      bucket.lectureCount = (bucket.lectureCount || 0) + 1;
    }
  } else {
    // Remove entry
    bucket.entries = (bucket.entries || []).filter((e) => e.lectureId !== lecture.id);
    bucket.totalSec = Math.max(0, (bucket.totalSec || 0) - durationSec);
    bucket.lectureCount = Math.max(0, (bucket.lectureCount || 0) - 1);
  }

  // Check if limit reached
  bucket.limitReached = bucket.totalSec >= DAILY_LIMIT_SEC;

  const updatedStore = {
    ...store,
    dailyLog: { ...store.dailyLog, [dateKey]: bucket },
  };

  // Recompute velocity EWMA after update
  updatedStore.velocityEWMA = computeVelocityEWMA(updatedStore.dailyLog);

  saveTrackingStore(courseId, updatedStore);
  return updatedStore;
}

/**
 * Returns today's accumulated learning seconds for a course.
 */
export function getTodayLearnedSec(courseId, dateKey) {
  const store = loadTrackingStore(courseId);
  return store.dailyLog[dateKey]?.totalSec || 0;
}

/**
 * Returns whether today's daily limit has been reached.
 */
export function isTodayLimitReached(courseId, dateKey) {
  const todaySec = getTodayLearnedSec(courseId, dateKey);
  return todaySec >= DAILY_LIMIT_SEC;
}

/**
 * Returns remaining seconds available today before the 5h cap.
 */
export function getTodayRemainingCapSec(courseId, dateKey) {
  return Math.max(0, DAILY_LIMIT_SEC - getTodayLearnedSec(courseId, dateKey));
}

/**
 * Computes a 7-day Exponential Weighted Moving Average of daily learning seconds.
 * Gives more weight to recent days for accurate ETA prediction.
 *
 * @param {object} dailyLog - { "YYYY-MM-DD": { totalSec } }
 * @returns {number} ewma in seconds per day, or 0 if no history
 */
export function computeVelocityEWMA(dailyLog = {}) {
  const alpha = 0.4; // decay factor — higher = more weight on recent days
  const sortedDates = Object.keys(dailyLog)
    .filter((d) => dailyLog[d]?.totalSec > 0)
    .sort();

  if (sortedDates.length === 0) return 0;

  let ewma = dailyLog[sortedDates[0]].totalSec;
  for (let i = 1; i < sortedDates.length; i++) {
    const sec = dailyLog[sortedDates[i]].totalSec;
    ewma = alpha * sec + (1 - alpha) * ewma;
  }
  return Math.round(ewma);
}

/**
 * Computes an accurate estimated completion date using local tracking velocity data.
 * Falls back to settings-based target if insufficient history.
 *
 * @param {object} params
 * @param {number} params.remainingSec - seconds left in course
 * @param {number} params.dailyTargetSec - daily target from settings
 * @param {object} params.dailyLog - raw daily log map
 * @param {string} params.today - "YYYY-MM-DD"
 * @returns {object} { etaDays, etaDate, etaDateStr, confidence, velocitySec, method }
 */
export function computeSmartETA({
  remainingSec = 0,
  dailyTargetSec = 5400,
  dailyLog = {},
  today,
}) {
  const activeDays = Object.values(dailyLog).filter((b) => b?.totalSec > 0);
  const velocityEWMA = computeVelocityEWMA(dailyLog);

  // Use actual velocity if we have at least 3 days of data, else fall back to target
  const effectiveVelocity = activeDays.length >= 3 && velocityEWMA > 0
    ? velocityEWMA
    : dailyTargetSec;

  const method = activeDays.length >= 3 ? 'velocity' : 'target';
  const confidence = activeDays.length >= 7 ? 'high' : activeDays.length >= 3 ? 'medium' : 'low';

  if (effectiveVelocity <= 0 || remainingSec <= 0) {
    return {
      etaDays: 0,
      etaDate: today,
      etaDateStr: 'Already complete',
      confidence,
      velocitySec: effectiveVelocity,
      method,
    };
  }

  const etaDaysExact = remainingSec / effectiveVelocity;
  const etaDays = Math.ceil(etaDaysExact);

  const startDate = today ? new Date(today + 'T00:00:00') : new Date();
  const etaDateObj = new Date(startDate);
  etaDateObj.setDate(etaDateObj.getDate() + etaDays);

  const etaDateStr = etaDateObj.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });

  return {
    etaDays,
    etaDaysExact: etaDaysExact.toFixed(1),
    etaDate: etaDateObj.toISOString().slice(0, 10),
    etaDateStr,
    confidence,
    velocitySec: effectiveVelocity,
    velocityLabel: formatSecToHHMM(effectiveVelocity),
    method,
  };
}

/**
 * Returns the last N days of daily learning activity for the activity log.
 * @param {object} dailyLog
 * @param {number} days - number of days to return (default 30)
 */
export function getActivityLog(dailyLog = {}, days = 30) {
  const sortedDates = Object.keys(dailyLog).sort().reverse().slice(0, days);
  return sortedDates.map((date) => {
    const bucket = dailyLog[date] || {};
    return {
      date,
      totalSec: bucket.totalSec || 0,
      lectureCount: bucket.lectureCount || 0,
      limitReached: bucket.limitReached || false,
      entries: bucket.entries || [],
    };
  });
}

/**
 * Computes overall course completion speed (% per day).
 * @param {object} params
 */
export function computeCompletionSpeed({ watchedCount, totalCount, dailyLog }) {
  const activeDays = Object.values(dailyLog).filter((b) => b?.lectureCount > 0).length;
  if (activeDays === 0 || totalCount === 0) return { lecturesPerDay: 0, pctPerDay: 0 };
  const lecturesPerDay = watchedCount / activeDays;
  const pctPerDay = (lecturesPerDay / totalCount) * 100;
  return {
    lecturesPerDay: lecturesPerDay.toFixed(1),
    pctPerDay: pctPerDay.toFixed(2),
    activeDays,
  };
}

/**
 * Computes per-day stats for the last 7 days (useful for sparkline).
 */
export function getLast7DaysStats(dailyLog = {}, today) {
  const result = [];
  const base = today ? new Date(today + 'T00:00:00') : new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const bucket = dailyLog[key] || {};
    result.push({
      date: key,
      totalSec: bucket.totalSec || 0,
      lectureCount: bucket.lectureCount || 0,
    });
  }
  return result;
}

/** Helper: format seconds to "Xh Ym" */
export function formatSecToHHMM(sec) {
  if (!sec || sec <= 0) return '0m';
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

/**
 * Clears the tracking store for a course (called on course reset).
 */
export function clearTrackingStore(courseId) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(getTrackingKey(courseId));
  } catch {
    // ignore
  }
}
