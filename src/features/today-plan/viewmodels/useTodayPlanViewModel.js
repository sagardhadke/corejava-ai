import { useMemo } from 'react';
import { computePlanStats } from '../models/todayPlanModel.js';

/**
 * Headless Today's Plan ViewModel Hook
 * Encapsulates planned lectures computation, stats, and plan commands.
 */
export function useTodayPlanViewModel({
  course = null,
  planSet = new Set(),
  watchedSet = new Set(),
  targetSec = 5400,
  autoPlan = true,
  lectureNumbers = new Map(),
  isTodayPracticeDay = false,
  hasWatchedToday = false,
  todayWatchedSec = 0,
  startDate = null,
  onToggleWatched,
  onTogglePlan,
  onClearPlan,
  onOpenPracticeModal,
  onUnmarkPracticeDay,
}) {
  const allLectures = useMemo(() => course?.allLectures || [], [course]);

  const {
    planned,
    plannedCount,
    plannedSec,
    plannedWatchedCount,
    plannedWatchedSec,
    plannedRemainingSec,
  } = useMemo(() => {
    return computePlanStats(allLectures, planSet, watchedSet);
  }, [allLectures, planSet, watchedSet]);

  const isGoalReached = plannedCount > 0 && plannedRemainingSec <= 0;

  return {
    // View State
    plannedLectures: planned,
    plannedCount,
    plannedSec,
    plannedWatchedCount,
    plannedWatchedSec,
    plannedRemainingSec,
    targetSec,
    autoPlan,
    isGoalReached,
    lectureNumbers,
    isTodayPracticeDay,
    hasWatchedToday,
    todayWatchedSec,
    startDate,

    // Commands / Handlers
    toggleWatched: onToggleWatched,
    togglePlan: onTogglePlan,
    clearPlan: onClearPlan,
    openPracticeModal: onOpenPracticeModal,
    unmarkPracticeDay: onUnmarkPracticeDay,
  };
}
