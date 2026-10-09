import { useState, useMemo, useCallback } from 'react';
import { dateKey, MONTHS } from '../../../utils/time.js';
import { buildWeeksForYear, intensity } from '../models/calendarGridModel.js';
import { getAggregatedHistory, formatActivityDate } from '../models/activityHistoryModel.js';
import { computeCurrentStreak, computeLongestStreak } from '../models/streakModel.js';

/**
 * Headless Streak & Calendar ViewModel Hook
 * Encapsulates calendar grid state, year selection, practice day logging, and activity aggregation.
 */
export function useStreakViewModel({
  history = {},
  courses = [],
  course = null,
  startDate = null,
  targetSec = 5400,
  streakMode = 'any',
  onMarkPracticeDay,
  onUnmarkPracticeDay,
}) {
  const currentYear = new Date().getFullYear();
  const courseStartYear = useMemo(() => {
    if (!startDate) return currentYear;
    const y = parseInt(startDate.slice(0, 4), 10);
    return isNaN(y) ? currentYear : Math.min(y, currentYear);
  }, [startDate, currentYear]);

  const availableYears = useMemo(() => {
    const yrs = [];
    for (let y = currentYear; y >= courseStartYear; y--) {
      yrs.push(y);
    }
    return yrs;
  }, [currentYear, courseStartYear]);

  const [selectedYearState, setSelectedYear] = useState(currentYear);
  const selectedYear = (selectedYearState < courseStartYear || selectedYearState > currentYear)
    ? currentYear
    : selectedYearState;

  const isCurrentYear = selectedYear === currentYear;
  const weeks = useMemo(() => buildWeeksForYear(selectedYear, isCurrentYear), [selectedYear, isCurrentYear]);

  const todayKey = dateKey();
  const [selectedDateKey, setSelectedDateKey] = useState(() => dateKey());
  const [showLearnMore, setShowLearnMore] = useState(false);

  const [practiceModalOpen, setPracticeModalOpen] = useState(false);
  const [practiceModalDate, setPracticeModalDate] = useState(null);

  const aggregatedHistory = useMemo(
    () => getAggregatedHistory(courses, course, history),
    [courses, course, history]
  );

  const currentStreak = useMemo(
    () => computeCurrentStreak(history, streakMode, targetSec),
    [history, streakMode, targetSec]
  );

  const longestStreak = useMemo(
    () => computeLongestStreak(history, streakMode, targetSec),
    [history, streakMode, targetSec]
  );

  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      const midDay = week[3];
      const m = midDay.getMonth();
      if (m !== lastMonth) {
        labels.push({ colIndex: wi, label: MONTHS[m] });
        lastMonth = m;
      }
    });
    return labels;
  }, [weeks]);

  const totalActiveDays = useMemo(
    () => Object.values(aggregatedHistory).filter((b) => b.watchedCount > 0 || b.isPractice || b.isStreakFreeze).length,
    [aggregatedHistory]
  );

  const selectedBucket = aggregatedHistory[selectedDateKey] || {
    watchedSec: 0,
    watchedCount: 0,
    entries: [],
    isPractice: false,
    practiceNote: '',
  };

  const selectedDateParts = selectedDateKey.split('-').map(Number);
  const selectedDateObj = new Date(selectedDateParts[0], selectedDateParts[1] - 1, selectedDateParts[2]);
  const isSelectedDateFuture = selectedDateObj > new Date();
  const isSelectedDateBeforeStart = !!(startDate && selectedDateKey < startDate);
  const isSelectedDateMissed = !isSelectedDateFuture && !isSelectedDateBeforeStart && selectedDateKey !== todayKey && !selectedBucket.isPractice && !(selectedBucket.watchedCount > 0) && !selectedBucket.isStreakFreeze;
  const isTodayPracticeDay = !!history[todayKey]?.isPractice && (!startDate || todayKey >= startDate);
  const hasWatchedToday = (history[todayKey]?.watchedCount || 0) > 0;
  const isTodayBeforeStart = !!(startDate && todayKey < startDate);

  // Command handlers
  const handleSelectYear = useCallback((yr) => setSelectedYear(yr), []);
  const handleSelectDate = useCallback((key) => setSelectedDateKey(key), []);
  const handleToggleLearnMore = useCallback(() => setShowLearnMore((prev) => !prev), []);

  const handleOpenPracticeModal = useCallback((targetDate = null) => {
    setPracticeModalDate(targetDate);
    setPracticeModalOpen(true);
  }, []);

  const handleClosePracticeModal = useCallback(() => {
    setPracticeModalOpen(false);
    setPracticeModalDate(null);
  }, []);

  const handleConfirmPractice = useCallback((note, explicitDateKey) => {
    if (typeof onMarkPracticeDay === 'function') {
      const targetDateKey = explicitDateKey || (practiceModalDate ? dateKey(practiceModalDate) : undefined);
      onMarkPracticeDay(note, targetDateKey);
    }
    setPracticeModalOpen(false);
  }, [onMarkPracticeDay, practiceModalDate]);

  const handleUndoPractice = useCallback((targetDateKey) => {
    if (typeof onUnmarkPracticeDay === 'function') {
      onUnmarkPracticeDay(targetDateKey);
    }
  }, [onUnmarkPracticeDay]);

  return {
    // View State
    currentYear,
    selectedYear,
    availableYears,
    isCurrentYear,
    weeks,
    monthLabels,
    selectedDateKey,
    selectedBucket,
    totalActiveDays,
    showLearnMore,
    isTodayPracticeDay,
    hasWatchedToday,
    isSelectedDateFuture,
    isSelectedDateBeforeStart,
    isSelectedDateMissed,
    isTodayBeforeStart,
    practiceModalOpen,
    practiceModalDate,
    currentStreak,
    longestStreak,
    todayKey,
    formatDateString: formatActivityDate,
    getIntensity: (bucket) => intensity(bucket, targetSec, streakMode),

    // Commands / Handlers
    selectYear: handleSelectYear,
    selectDate: handleSelectDate,
    toggleLearnMore: handleToggleLearnMore,
    openPracticeModal: handleOpenPracticeModal,
    closePracticeModal: handleClosePracticeModal,
    confirmPractice: handleConfirmPractice,
    undoPractice: handleUndoPractice,
  };
}
