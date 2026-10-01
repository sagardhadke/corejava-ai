import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { getBadgesStatus, getBadgeRank } from '../models/badgeModel.js';

/**
 * Headless Badges ViewModel Hook
 * Encapsulates all reactive badge state, filter logic, synchronization, and user actions.
 */
export function useBadgesViewModel({
  pct = 0,
  streak = 0,
  longestStreak = 0,
  courseId = 'default',
  courseTitle = 'Course',
  unlockedDates = {},
  onUpdateUnlockedDates,
}) {
  const [selectedTab, setSelectedTab] = useState('all');
  const [inspectBadge, setInspectBadge] = useState(null);
  const [copied, setCopied] = useState(false);
  const [newlyUnlockedBadge, setNewlyUnlockedBadge] = useState(null);

  // Evaluate badge statuses from Model
  const badges = useMemo(() => {
    return getBadgesStatus({
      pct,
      streak,
      longestStreak,
      unlockedDates,
    });
  }, [pct, streak, longestStreak, unlockedDates]);

  const unlockedCount = useMemo(() => badges.filter((b) => b.isUnlocked).length, [badges]);
  const totalCount = badges.length || 12;
  const overallPct = Math.round((unlockedCount / totalCount) * 100);
  const rank = useMemo(() => getBadgeRank(unlockedCount), [unlockedCount]);

  const completionBadges = useMemo(() => badges.filter((b) => b.category === 'completion'), [badges]);
  const streakBadges = useMemo(() => badges.filter((b) => b.category === 'streak'), [badges]);

  const completionUnlocked = useMemo(() => completionBadges.filter((b) => b.isUnlocked).length, [completionBadges]);
  const streakUnlocked = useMemo(() => streakBadges.filter((b) => b.isUnlocked).length, [streakBadges]);

  const nextCompletion = useMemo(() => completionBadges.find((b) => !b.isUnlocked), [completionBadges]);
  const nextStreak = useMemo(() => streakBadges.find((b) => !b.isUnlocked), [streakBadges]);
  const nextMilestone = nextCompletion || nextStreak || null;

  // Filtered list based on active tab
  const filteredBadges = useMemo(() => {
    switch (selectedTab) {
      case 'completion':
        return completionBadges;
      case 'streak':
        return streakBadges;
      case 'unlocked':
        return badges.filter((b) => b.isUnlocked);
      case 'locked':
        return badges.filter((b) => !b.isUnlocked);
      case 'all':
      default:
        return badges;
    }
  }, [selectedTab, badges, completionBadges, streakBadges]);

  // Synchronize newly unlocked badges with persistence callback
  const prevCourseIdRef = useRef(courseId);
  const initialMountRef = useRef(true);

  useEffect(() => {
    const courseChanged = prevCourseIdRef.current !== courseId;
    if (courseChanged) {
      prevCourseIdRef.current = courseId;
      initialMountRef.current = true;
    }

    const currentUnlocked = badges.filter((b) => b.isUnlocked);
    const storedIds = new Set(Object.keys(unlockedDates));
    const missingFromStorage = currentUnlocked.filter((b) => !storedIds.has(b.id));

    if (missingFromStorage.length > 0 && typeof onUpdateUnlockedDates === 'function') {
      const updated = { ...unlockedDates };
      const nowIso = new Date().toISOString();
      missingFromStorage.forEach((b) => {
        updated[b.id] = nowIso;
      });
      onUpdateUnlockedDates(updated);

      if (!initialMountRef.current) {
        setNewlyUnlockedBadge(missingFromStorage[0]);
      }
    }

    initialMountRef.current = false;
  }, [badges, courseId, unlockedDates, onUpdateUnlockedDates]);

  // Command handlers
  const handleSelectTab = useCallback((tab) => setSelectedTab(tab), []);
  const handleOpenInspect = useCallback((badge) => setInspectBadge(badge), []);
  const handleCloseInspect = useCallback(() => setInspectBadge(null), []);
  const handleDismissToast = useCallback(() => setNewlyUnlockedBadge(null), []);

  const handleCopyShare = useCallback((badge) => {
    if (!badge) return;
    const text = `🏆 Achievement Unlocked: ${badge.title} (${badge.subtitle}) in "${courseTitle}"! Tracked with Course Tracker.`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [courseTitle]);

  return {
    // View State
    badges,
    filteredBadges,
    selectedTab,
    unlockedCount,
    totalCount,
    overallPct,
    rank,
    completionBadges,
    streakBadges,
    completionUnlocked,
    streakUnlocked,
    nextMilestone,
    nextCompletion,
    nextStreak,
    inspectBadge,
    copied,
    newlyUnlockedBadge,
    courseTitle,

    // Commands / Actions
    setTab: handleSelectTab,
    openInspect: handleOpenInspect,
    closeInspect: handleCloseInspect,
    copyShare: handleCopyShare,
    dismissToast: handleDismissToast,
  };
}
