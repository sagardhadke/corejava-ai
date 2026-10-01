import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { dateKey, formatDuration } from '../utils/time';
import { getBadgesStatus } from '../features/badges/models/badgeModel.js';
import { DEFAULT_SETTINGS } from '../features/settings/models/settingsModel.js';
import { computeAutoPlanIds } from '../features/today-plan/models/todayPlanModel.js';
import {
  computeCourseStats,
  computeSectionProgress,
  computeFirstWatchedDate,
  computeEffectiveStartDate,
} from '../features/course/models/courseProgressModel.js';
import { computeCurrentStreak, computeLongestStreak } from '../features/streak/models/streakModel.js';

/**
 * All progress state for ONE course, namespaced by courseId so switching the
 * active course never mixes up watched/plan/streak data between courses.
 *
 * Implements Headless MVVM pattern by delegating business calculations
 * to pure Domain Models in features/.
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
  const BADGES_KEY = `jct_badges__${courseId}`;

  const [watched, setWatched] = useLocalStorage(WATCHED_KEY, {});
  const [planStore, setPlanStore] = useLocalStorage(PLAN_KEY, { date: null, ids: [], auto: true });
  const [settings, setSettings] = useLocalStorage(SETTINGS_KEY, DEFAULT_SETTINGS);
  const [history, setHistory] = useLocalStorage(HISTORY_KEY, {});
  const [storedStartDate, setStoredStartDate] = useLocalStorage(START_DATE_KEY, null);
  const [isStartDateManual, setIsStartDateManual] = useLocalStorage(START_DATE_MANUAL_KEY, false);
  const [unlockedBadges, setUnlockedBadges] = useLocalStorage(BADGES_KEY, {});
  const [newlyUnlockedBadge, setNewlyUnlockedBadge] = useState(null);
  const [today, setToday] = useState(() => dateKey());

  const watchedSet = useMemo(() => new Set(Object.keys(watched).filter((id) => watched[id])), [watched]);

  const targetSec = Math.round((settings.dailyTargetHours || 1.5) * 3600);

  // Today's plan is generated ONCE per calendar day and frozen in localStorage
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
      return { ...prev, ids, auto: false };
    });
  }, [setPlanStore]);

  const clearPlan = useCallback(() => {
    setPlanStore((prev) => ({ ...prev, ids: [], auto: false }));
  }, [setPlanStore]);

  const regenerateAutoPlan = useCallback(() => {
    const ids = computeAutoPlanIds(targetSec, watchedSet, allLectures);
    setPlanStore({ date: today, ids, auto: true });
  }, [targetSec, watchedSet, today, setPlanStore, allLectures]);

  const firstWatchedDate = useMemo(() => computeFirstWatchedDate(history), [history]);

  const startDate = useMemo(() => computeEffectiveStartDate({
    isStartDateManual,
    storedStartDate,
    firstWatchedDate,
    today,
  }), [isStartDateManual, storedStartDate, firstWatchedDate, today]);

  const markPracticeDay = useCallback((note, targetDateKey) => {
    const key = targetDateKey || dateKey();
    if (startDate && key < startDate) return;
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
    setUnlockedBadges({});
    setNewlyUnlockedBadge(null);
  }, [setWatched, setPlanStore, setHistory, settings.autoPlan, targetSec, allLectures, setIsStartDateManual, setStoredStartDate, setUnlockedBadges]);

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

  const stats = useMemo(
    () => computeCourseStats(allLectures, watchedSet, planSet),
    [allLectures, watchedSet, planSet]
  );

  const sectionProgress = useMemo(
    () => computeSectionProgress(course, watchedSet),
    [course, watchedSet]
  );

  const streak = useMemo(
    () => computeCurrentStreak(history, settings.streakMode, targetSec),
    [history, settings.streakMode, targetSec]
  );

  const longestStreak = useMemo(
    () => computeLongestStreak(history, settings.streakMode, targetSec),
    [history, settings.streakMode, targetSec]
  );

  const isTodayPracticeDay = !!history[dateKey()]?.isPractice && (!startDate || dateKey() >= startDate);
  const hasWatchedToday = (history[dateKey()]?.watchedCount || 0) > 0;

  // Badges calculation based on current course completion and streak
  const badges = useMemo(() => {
    return getBadgesStatus({
      pct: stats.pct,
      streak,
      longestStreak,
      unlockedDates: unlockedBadges,
    });
  }, [stats.pct, streak, longestStreak, unlockedBadges]);

  const unlockedBadgesCount = useMemo(() => badges.filter((b) => b.isUnlocked).length, [badges]);

  // Synchronize unlocked badges with storage and detect new unlocks
  const prevCourseIdForBadgesRef = useRef(courseId);
  const initialBadgesMountRef = useRef(true);

  useEffect(() => {
    const courseChanged = prevCourseIdForBadgesRef.current !== courseId;
    if (courseChanged) {
      prevCourseIdForBadgesRef.current = courseId;
      initialBadgesMountRef.current = true;
    }

    const currentUnlocked = badges.filter((b) => b.isUnlocked);
    const storedIds = new Set(Object.keys(unlockedBadges));
    const missingFromStorage = currentUnlocked.filter((b) => !storedIds.has(b.id));

    if (missingFromStorage.length > 0) {
      const updated = { ...unlockedBadges };
      const nowIso = new Date().toISOString();
      missingFromStorage.forEach((b) => {
        updated[b.id] = nowIso;
      });
      setUnlockedBadges(updated);

      if (!initialBadgesMountRef.current) {
        setNewlyUnlockedBadge(missingFromStorage[0]);
      }
    }

    initialBadgesMountRef.current = false;
  }, [badges, courseId, unlockedBadges, setUnlockedBadges]);

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
    badges,
    unlockedBadgesCount,
    newlyUnlockedBadge,
    clearNewlyUnlockedBadge: () => setNewlyUnlockedBadge(null),
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
