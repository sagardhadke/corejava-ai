/**
 * Badges & Achievements Domain Model (Pure Domain Logic - Zero React/DOM dependencies)
 */

export const COURSE_COMPLETION_BADGES = [
  {
    id: 'completion_10',
    category: 'completion',
    threshold: 10,
    title: '10% Starter',
    subtitle: 'First Steps',
    description: 'Complete 10% of the course lectures.',
    tier: 'bronze',
    tierLabel: 'Bronze Tier',
    themeColor: '#cd7f32',
    gradient: 'linear-gradient(135deg, #cd7f32 0%, #b87333 100%)',
    bgGlow: 'rgba(205, 127, 50, 0.25)',
  },
  {
    id: 'completion_20',
    category: 'completion',
    threshold: 20,
    title: '20% Momentum',
    subtitle: 'Gaining Traction',
    description: 'Complete 20% of the course lectures.',
    tier: 'bronze-plus',
    tierLabel: 'Copper Tier',
    themeColor: '#e07a5f',
    gradient: 'linear-gradient(135deg, #e07a5f 0%, #d05333 100%)',
    bgGlow: 'rgba(224, 122, 95, 0.25)',
  },
  {
    id: 'completion_50',
    category: 'completion',
    threshold: 50,
    title: '50% Halfway Hero',
    subtitle: 'Major Milestone',
    description: 'Complete half (50%) of the entire course curriculum.',
    tier: 'silver',
    tierLabel: 'Silver Tier',
    themeColor: '#94a3b8',
    gradient: 'linear-gradient(135deg, #cbd5e1 0%, #64748b 100%)',
    bgGlow: 'rgba(148, 163, 184, 0.3)',
  },
  {
    id: 'completion_80',
    category: 'completion',
    threshold: 80,
    title: '80% Deep Mastery',
    subtitle: 'Expert Territory',
    description: 'Complete 80% of the course lectures.',
    tier: 'gold',
    tierLabel: 'Gold Tier',
    themeColor: '#ffb800',
    gradient: 'linear-gradient(135deg, #ffd54a 0%, #ff9800 100%)',
    bgGlow: 'rgba(255, 184, 0, 0.35)',
  },
  {
    id: 'completion_90',
    category: 'completion',
    threshold: 90,
    title: '90% Final Stretch',
    subtitle: 'Summit in Sight',
    description: 'Complete 90% of the course lectures.',
    tier: 'platinum',
    tierLabel: 'Platinum Tier',
    themeColor: '#38bdf8',
    gradient: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
    bgGlow: 'rgba(56, 189, 248, 0.35)',
  },
  {
    id: 'completion_100',
    category: 'completion',
    threshold: 100,
    title: '100% Course Champion',
    subtitle: 'Curriculum Completed',
    description: 'Finish every single lecture in the course and achieve 100% completion!',
    tier: 'legend',
    tierLabel: 'Champion Tier',
    themeColor: '#a855f7',
    gradient: 'linear-gradient(135deg, #c084fc 0%, #7e22ce 100%)',
    bgGlow: 'rgba(168, 85, 247, 0.4)',
  },
];

export const STREAK_BADGES = [
  {
    id: 'streak_7',
    category: 'streak',
    threshold: 7,
    title: '7-Day Warrior',
    subtitle: 'One Week Unbroken',
    description: 'Maintain an active study streak of 7 consecutive days.',
    tier: 'bronze',
    tierLabel: 'Bronze Tier',
    themeColor: '#f97316',
    gradient: 'linear-gradient(135deg, #fb923c 0%, #ea580c 100%)',
    bgGlow: 'rgba(249, 115, 22, 0.25)',
  },
  {
    id: 'streak_15',
    category: 'streak',
    threshold: 15,
    title: '15-Day Fortnight',
    subtitle: 'Two Weeks of Habit',
    description: 'Maintain an active study streak of 15 consecutive days.',
    tier: 'bronze-plus',
    tierLabel: 'Bronze+ Tier',
    themeColor: '#fb7185',
    gradient: 'linear-gradient(135deg, #fda4af 0%, #e11d48 100%)',
    bgGlow: 'rgba(251, 113, 133, 0.25)',
  },
  {
    id: 'streak_30',
    category: 'streak',
    threshold: 30,
    title: '30-Day Monthly Master',
    subtitle: 'Full Month Streak',
    description: 'Maintain an unbroken study streak of 30 consecutive days.',
    tier: 'silver',
    tierLabel: 'Silver Tier',
    themeColor: '#34d399',
    gradient: 'linear-gradient(135deg, #6ee7b7 0%, #059669 100%)',
    bgGlow: 'rgba(52, 211, 153, 0.3)',
  },
  {
    id: 'streak_50',
    category: 'streak',
    threshold: 50,
    title: '50-Day Golden Resolve',
    subtitle: 'Unstoppable Momentum',
    description: 'Maintain an unbroken study streak of 50 consecutive days.',
    tier: 'gold',
    tierLabel: 'Gold Tier',
    themeColor: '#eab308',
    gradient: 'linear-gradient(135deg, #facc15 0%, #ca8a04 100%)',
    bgGlow: 'rgba(234, 179, 8, 0.35)',
  },
  {
    id: 'streak_75',
    category: 'streak',
    threshold: 75,
    title: '75-Day Diamond Focus',
    subtitle: 'Elite Consistency',
    description: 'Maintain an unbroken study streak of 75 consecutive days.',
    tier: 'platinum',
    tierLabel: 'Diamond Tier',
    themeColor: '#06b6d4',
    gradient: 'linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)',
    bgGlow: 'rgba(6, 182, 212, 0.35)',
  },
  {
    id: 'streak_100',
    category: 'streak',
    threshold: 100,
    title: '100-Day Centurion Legend',
    subtitle: 'Triple-Digit Mastery',
    description: 'Achieve a legendary study streak of 100 consecutive days!',
    tier: 'legend',
    tierLabel: 'Legend Tier',
    themeColor: '#ec4899',
    gradient: 'linear-gradient(135deg, #f472b6 0%, #be185d 100%)',
    bgGlow: 'rgba(236, 72, 153, 0.4)',
  },
];

export const ALL_BADGES = [...COURSE_COMPLETION_BADGES, ...STREAK_BADGES];

/**
 * Evaluates status for all badges given current percentage and streak data.
 */
export function getBadgesStatus({ pct = 0, streak = 0, longestStreak = 0, unlockedDates = {} }) {
  const currentPct = Math.max(0, Math.min(100, Number(pct) || 0));
  const effectiveStreak = Math.max(0, Number(streak) || 0, Number(longestStreak) || 0);

  return ALL_BADGES.map((badge) => {
    const isCompletion = badge.category === 'completion';
    const currentValue = isCompletion ? currentPct : effectiveStreak;
    const isUnlocked = currentValue >= badge.threshold;
    const progress = Math.min(100, Math.max(0, Math.round((currentValue / badge.threshold) * 100)));
    const remainingToUnlock = Math.max(0, badge.threshold - currentValue);
    const unlockedAt = isUnlocked ? unlockedDates[badge.id] || null : null;

    return {
      ...badge,
      isUnlocked,
      progress,
      currentValue,
      remainingToUnlock,
      unit: isCompletion ? '%' : ' days',
      unlockedAt,
    };
  });
}

/**
 * Returns rank metadata based on total unlocked achievements.
 */
export function getBadgeRank(unlockedCount = 0) {
  if (unlockedCount >= 12) {
    return { title: 'Grandmaster Legend', level: 6, desc: 'Maximum achievements achieved. Truly phenomenal dedication!' };
  }
  if (unlockedCount >= 10) {
    return { title: 'Centurion Master', level: 5, desc: 'Among the top dedicated learners with outstanding mastery.' };
  }
  if (unlockedCount >= 7) {
    return { title: 'Elite Achiever', level: 4, desc: 'Over half of all badges conquered with high momentum.' };
  }
  if (unlockedCount >= 4) {
    return { title: 'Consistent Scholar', level: 3, desc: 'Building strong habits and consistent course progress.' };
  }
  if (unlockedCount >= 1) {
    return { title: 'Dedicated Novice', level: 2, desc: 'Your learning journey has unlocked its first achievements.' };
  }
  return { title: 'Aspiring Achiever', level: 1, desc: 'Begin your streak or complete 10% to unlock your first badge.' };
}
