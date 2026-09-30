import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { dateKey, formatDuration } from '../utils/time';

const DEFAULT_SETTINGS = {
  dailyTargetHours: 1.5,          // selected by default from first load — no manual setup needed
  autoPlan: true,                 // Mode A: auto-pick next unwatched lectures until target reached
  streakMode: 'any',              // 'any' = >=1 lecture watched, 'target' = full daily target hit
  perSectionVisibleCount: 7,      // Number of sections visible at once in sidebar (5 to 10, default 7)
};

function computeAutoPlanIds(targetSec, watchedSet, allLectures) {
  const ids = [];
  let sum = 0;
  for (const l of allLectures) {
    if (watchedSet.has(l.id)) continue;
    ids.push(l.id);
    sum += l.durationSec;
    if (sum >= targetSec) break;
  }
  return ids;
}

/**
 * All progress state for ONE course, namespaced by courseId so switching the
 * active course never mixes up watched/plan/streak data between courses.
 */
export function useCourseProgress(course) {
  const courseId = course?.id || 'none';
  const allLectures = useMemo(() => course?.allLectures || [], [course]);

  const WATCHED_KEY = `jct_watched__${courseId}`;
  const PLAN_KEY = `jct_today_plan__${courseId}`;
  const SETTINGS_KEY = `jct_settings__${courseId}`;
  const HISTORY_KEY = `jct_history__${courseId}`;
  const START_DATE_KEY = `jct_start_date__${courseId}`;
  const START_DATE_MANUAL_KEY = `jct_start_date_manual__${courseId}`;

  const [watched, setWatched] = useLocalStorage(WATCHED_KEY, {});
  const [planStore, setPlanStore] = useLocalStorage(PLAN_KEY, { date: null, ids: [], auto: true });
  const [settings, setSettings] = useLocalStorage(SETTINGS_KEY, DEFAULT_SETTINGS);
  const [history, setHistory] = useLocalStorage(HISTORY_KEY, {});
  const [storedStartDate, setStoredStartDate] = useLocalStorage(START_DATE_KEY, null);
  const [isStartDateManual, setIsStartDateManual] = useLocalStorage(START_DATE_MANUAL_KEY, false);
  const [today, setToday] = useState(() => dateKey());

  const watchedSet = useMemo(() => new Set(Object.keys(watched).filter((id) => watched[id])), [watched]);

  const targetSec = Math.round((settings.dailyTargetHours || 1.5) * 3600);

  // Today's plan is generated ONCE per calendar day and then frozen in
  // localStorage under PLAN_KEY (keyed by date). It must NOT silently
  // regenerate on page reload, on marking lectures watched, or on any other
  // re-render — only an actual date change (a new day has started) or an
  // explicit user action (toggling auto-plan on, hitting "regenerate", or
  // changing the daily target while auto-plan is on) is allowed to replace it.
  // On the very first load for a course (planStore.date is null), the
  // dailyTargetHours default of 1.5h already applies from DEFAULT_SETTINGS
  // above, so no separate "first load" branch is needed — isNewDay covers it.
  const prevAutoOnRef = useRef(settings.autoPlan);
  const prevTargetSecRef = useRef(targetSec);
  const prevCourseIdRef = useRef(courseId);
  useEffect(() => {
    const courseChanged = prevCourseIdRef.current !== courseId;
    const isNewDay = planStore.date !== today || courseChanged;
    const autoJustTurnedOn = !prevAutoOnRef.current && settings.autoPlan;
    const targetChangedWhileAutoOn = settings.autoPlan && prevTargetSecRef.current !== targetSec;

    if (isNewDay) {
      const ids = settings.autoPlan ? computeAutoPlanIds(targetSec, watchedSet, allLectures) : [];
      setPlanStore({ date: today, ids, auto: settings.autoPlan });
    } else if (autoJustTurnedOn || targetChangedWhileAutoOn) {
      const ids = computeAutoPlanIds(targetSec, watchedSet, allLectures);
      setPlanStore((prev) => ({ ...prev, ids, auto: true }));
    }

    prevAutoOnRef.current = settings.autoPlan;
    prevTargetSecRef.current = targetSec;
    prevCourseIdRef.current = courseId;
    // watchedSet and planStore are deliberately excluded: this effect should only
    // react to the day changing, the course changing, or these two specific
    // settings changing — never to lectures being marked watched or to its own
    // writes to planStore.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, courseId, settings.autoPlan, targetSec]);

  // Midnight rollover watcher
  useEffect(() => {
    const check = () => {
      const key = dateKey();
      if (key !== today) setToday(key);
    };
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, [today]);

  const toggleWatched = useCallback((lectureId, lecture) => {
    setWatched((prev) => {
      const isNowWatched = !prev[lectureId];
      const next = { ...prev, [lectureId]: isNowWatched };

      setHistory((h) => {
        const key = dateKey();
        const bucket = h[key] || { watchedSec: 0, watchedCount: 0, lectureIds: [] };
        const already = bucket.lectureIds.includes(lectureId);
        let nextBucket;
        if (isNowWatched && !already) {
          const lecIndex = allLectures.findIndex((l) => l.id === lectureId);
          const lectureNumber = lecIndex >= 0 ? lecIndex + 1 : (lecture?.number || null);
          const entry = {
            courseId: course?.id || 'core-java-ai',
            courseTitle: course?.title || 'Core Java + AI',
            lectureId,
            lectureNumber,
            lectureTitle: lecture?.title || `Lecture ${lectureNumber || ''}`,
            durationSec: lecture?.durationSec || 0,
            durationLabel: lecture?.durationLabel || formatDuration(lecture?.durationSec || 0),
            watchedAt: new Date().toISOString(),
          };
          nextBucket = {
            watchedSec: bucket.watchedSec + (lecture?.durationSec || 0),
            watchedCount: bucket.watchedCount + 1,
            lectureIds: [...bucket.lectureIds, lectureId],
            entries: [...(bucket.entries || []).filter((e) => e.lectureId !== lectureId), entry],
          };
        } else if (!isNowWatched && already) {
          nextBucket = {
            watchedSec: Math.max(0, bucket.watchedSec - (lecture?.durationSec || 0)),
            watchedCount: Math.max(0, bucket.watchedCount - 1),
            lectureIds: bucket.lectureIds.filter((id) => id !== lectureId),
            entries: (bucket.entries || []).filter((e) => e.lectureId !== lectureId),
          };
        } else {
          nextBucket = bucket;
        }
        return { ...h, [key]: nextBucket };
      });

      return next;
    });
  }, [setWatched, setHistory, allLectures, course]);

  const unmarkPracticeDay = useCallback((targetDateKey) => {
    const key = targetDateKey || dateKey();
    setHistory((h) => {
      const bucket = h[key];
      if (!bucket) return h;
      const rest = { ...bucket };
      delete rest.isPractice;
      delete rest.practiceNote;
      return { ...h, [key]: rest };
    });
  }, [setHistory]);

  const togglePlan = useCallback((lectureId) => {
    setPlanStore((prev) => {
      const has = prev.ids.includes(lectureId);
      const ids = has ? prev.ids.filter((id) => id !== lectureId) : [...prev.ids, lectureId];
      return { ...prev, ids, auto: false }; // manual toggle always switches this session to manual
    });
  }, [setPlanStore]);

  const clearPlan = useCallback(() => {
    setPlanStore((prev) => ({ ...prev, ids: [], auto: false }));
  }, [setPlanStore]);

  const regenerateAutoPlan = useCallback(() => {
    const ids = computeAutoPlanIds(targetSec, watchedSet, allLectures);
    setPlanStore({ date: today, ids, auto: true });
  }, [targetSec, watchedSet, today, setPlanStore, allLectures]);

  const firstWatchedDate = useMemo(() => {
    const dates = Object.entries(history)
      .filter(([, b]) => (b?.watchedCount > 0 || (Array.isArray(b?.lectureIds) && b.lectureIds.length > 0)))
      .map(([d]) => d)
      .sort();
    return dates[0] || null;
  }, [history]);

  const startDate = useMemo(() => {
    if (isStartDateManual && storedStartDate) return storedStartDate;
    if (firstWatchedDate) return firstWatchedDate;
    return storedStartDate || today;
  }, [isStartDateManual, storedStartDate, firstWatchedDate, today]);

  const markPracticeDay = useCallback((note, targetDateKey) => {
    const key = targetDateKey || dateKey();
    if (startDate && key < startDate) return; // Strict: disallow marking practice before start date!
    setHistory((h) => {
      const bucket = h[key] || { watchedSec: 0, watchedCount: 0, lectureIds: [] };
      return {
        ...h,
        [key]: { ...bucket, isPractice: true, practiceNote: note },
      };
    });
  }, [setHistory, startDate]);

  const resetAll = useCallback(() => {
    setWatched({});
    setPlanStore({ date: dateKey(), ids: settings.autoPlan ? computeAutoPlanIds(targetSec, new Set(), allLectures) : [], auto: settings.autoPlan });
    setHistory({});
    setIsStartDateManual(false);
    setStoredStartDate(null);
  }, [setWatched, setPlanStore, setHistory, settings.autoPlan, targetSec, allLectures, setIsStartDateManual, setStoredStartDate]);

  const updateSettings = useCallback((patch) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, [setSettings]);

  const updateStartDate = useCallback((newDate) => {
    if (newDate) {
      setIsStartDateManual(true);
      setStoredStartDate(newDate);
    } else {
      setIsStartDateManual(false);
      setStoredStartDate(null);
    }
  }, [setIsStartDateManual, setStoredStartDate]);

  const resetStartDateToAuto = useCallback(() => {
    setIsStartDateManual(false);
    setStoredStartDate(null);
  }, [setIsStartDateManual, setStoredStartDate]);

  const planSet = useMemo(() => new Set(planStore.ids), [planStore.ids]);

  const stats = useMemo(() => {
    const watchedList = allLectures.filter((l) => watchedSet.has(l.id));
    const watchedSec = watchedList.reduce((a, l) => a + l.durationSec, 0);
    const totalSeconds = allLectures.reduce((a, l) => a + l.durationSec, 0);
    const planned = allLectures.filter((l) => planSet.has(l.id));
    const plannedSec = planned.reduce((a, l) => a + l.durationSec, 0);
    const plannedWatchedSec = planned.filter((l) => watchedSet.has(l.id)).reduce((a, l) => a + l.durationSec, 0);
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
  }, [watchedSet, planSet, allLectures]);

  // Per-section progress: for each section, how many lectures watched out of
  // total, and how much time remains in that section.
  const sectionProgress = useMemo(() => {
    if (!course) return [];
    return course.sections.map((section) => {
      const total = section.lectures.length;
      const watchedCount = section.lectures.filter((l) => watchedSet.has(l.id)).length;
      const totalSec = section.lectures.reduce((a, l) => a + l.durationSec, 0);
      const watchedSec = section.lectures.filter((l) => watchedSet.has(l.id)).reduce((a, l) => a + l.durationSec, 0);
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
  }, [course, watchedSet]);

  // Streak calc: walk backward day by day from today, counting consecutive qualifying days.
  const streak = useMemo(() => {
    const qualifies = (bucket) => {
      if (!bucket) return false;
      if (bucket.isPractice) return true;
      if (settings.streakMode === 'target') return bucket.watchedSec >= targetSec;
      return bucket.watchedCount > 0;
    };
    let count = 0;
    let cursor = new Date();
    if (!qualifies(history[dateKey(cursor)])) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (qualifies(history[dateKey(cursor)])) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [history, settings.streakMode, targetSec]);

  const longestStreak = useMemo(() => {
    const qualifies = (bucket) => {
      if (!bucket) return false;
      if (bucket.isPractice) return true;
      if (settings.streakMode === 'target') return bucket.watchedSec >= targetSec;
      return bucket.watchedCount > 0;
    };
    const keys = Object.keys(history).sort();
    let best = 0, cur = 0, prevDate = null;
    for (const k of keys) {
      if (!qualifies(history[k])) { cur = 0; prevDate = null; continue; }
      if (prevDate) {
        const diffDays = Math.round((new Date(k) - new Date(prevDate)) / 86400000);
        cur = diffDays === 1 ? cur + 1 : 1;
      } else {
        cur = 1;
      }
      best = Math.max(best, cur);
      prevDate = k;
    }
    return best;
  }, [history, settings.streakMode, targetSec]);

  const isTodayPracticeDay = !!history[dateKey()]?.isPractice && (!startDate || dateKey() >= startDate);
  const hasWatchedToday = (history[dateKey()]?.watchedCount || 0) > 0;

  return {
    watchedSet,
    planSet,
    settings,
    history,
    stats,
    sectionProgress,
    streak,
    longestStreak,
    today,
    targetSec,
    startDate,
    isStartDateManual,
    todayWatchedSec: history[today]?.watchedSec || 0,
    isTodayPracticeDay,
    hasWatchedToday,
    toggleWatched,
    markPracticeDay,
    unmarkPracticeDay,
    togglePlan,
    clearPlan,
    regenerateAutoPlan,
    resetAll,
    updateSettings,
    updateStartDate,
    resetStartDateToAuto,
  };
}
