/**
 * Settings Domain Model (Pure Domain Logic)
 * Decoupled from React, DOM, and UI rendering.
 */

export const DEFAULT_SETTINGS = {
  dailyTargetHours: 1.5,
  autoPlan: true,
  streakMode: 'any',
  perSectionVisibleCount: 7,
};

export const TARGET_PRESETS = [
  { label: '1h', value: 1 },
  { label: '1.5h', value: 1.5 },
  { label: '2h', value: 2 },
  { label: '3h', value: 3 },
];

export const PER_SECTION_OPTIONS = [
  { value: 10, label: '10 items', tag: 'Max', desc: 'Expanded view showing 10 sections before scrolling' },
  { value: 9, label: '9 items', tag: 'Tall', desc: 'Shows 9 sections before scrolling' },
  { value: 8, label: '8 items', tag: 'Balanced', desc: 'Shows 8 sections before scrolling' },
  { value: 7, label: '7 items', tag: 'Default · Medium', desc: 'Balanced view showing 7 sections before scrolling' },
  { value: 6, label: '6 items', tag: 'Standard', desc: 'Shows 6 sections before scrolling' },
  { value: 5, label: '5 items', tag: 'Compact', desc: 'Minimal height (compact default)' },
];

export function clampPerSectionCount(count, defaultCount = 7) {
  return Math.max(5, Math.min(10, Number(count) || defaultCount));
}

/**
 * Pure calculation for course target projection and estimated completion.
 */
export function computeTargetProjection({ course, stats, dailyTargetHours = 1.5, startDate }) {
  if (!course || !stats) return null;
  const targetHours = Number(dailyTargetHours) || 1.5;
  const dailyTargetSec = targetHours * 3600;
  const remainingHours = stats.remainingSec / 3600;
  const exactDays = remainingHours / targetHours;
  const approxDays = Math.ceil(exactDays);

  const start = startDate ? new Date(startDate + 'T00:00:00') : new Date();
  const completionDate = new Date(start);
  completionDate.setDate(completionDate.getDate() + approxDays);

  const completionDateStr = completionDate.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });

  return {
    exactDays: exactDays.toFixed(1),
    approxDays,
    dailyTargetSec,
    completionDateStr,
    totalHours: (course.totalSeconds / 3600).toFixed(1),
    remainingHours: remainingHours.toFixed(1),
  };
}
