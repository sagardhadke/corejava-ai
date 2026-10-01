/**
 * Builds the week-by-week grid for the GitHub-style contribution calendar.
 * When isCurrentYear is true, it preserves 52 weeks of history up to the current week
 * AND extends 1 additional month ahead so the user can see upcoming schedule/timeline.
 *
 * @param {number} year - The target year
 * @param {boolean} isCurrentYear - True if year is current year
 * @returns {Date[][]} Array of 7-day weeks (Sunday to Saturday)
 */
export function buildWeeksForYear(year, isCurrentYear) {
  const weeks = [];
  if (isCurrentYear) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Show 1 additional month ahead of today
    const ahead = new Date(today);
    ahead.setMonth(ahead.getMonth() + 1);
    const endDow = ahead.getDay();
    const gridEnd = new Date(ahead);
    gridEnd.setDate(gridEnd.getDate() + (6 - endDow)); // Saturday of the week 1 month ahead

    // Keep 52 weeks of history back from the current week
    const todayEndDow = today.getDay();
    const todayWeekEnd = new Date(today);
    todayWeekEnd.setDate(todayWeekEnd.getDate() + (6 - todayEndDow));
    const gridStart = new Date(todayWeekEnd);
    gridStart.setDate(gridStart.getDate() - (52 * 7 - 1)); // 52 weeks back

    const cursor = new Date(gridStart);
    let safety = 0;
    while (cursor <= gridEnd && safety < 70) {
      safety++;
      const week = [];
      for (let d = 0; d < 7; d++) {
        week.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }
  } else {
    const jan1 = new Date(year, 0, 1);
    const dec31 = new Date(year, 11, 31);
    const startDow = jan1.getDay();
    const gridStart = new Date(jan1);
    gridStart.setDate(gridStart.getDate() - startDow);

    const endDow = dec31.getDay();
    const gridEnd = new Date(dec31);
    gridEnd.setDate(gridEnd.getDate() + (6 - endDow));

    const cursor = new Date(gridStart);
    let safety = 0;
    while (cursor <= gridEnd && safety < 70) {
      safety++;
      const week = [];
      for (let d = 0; d < 7; d++) {
        week.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }
  }
  return weeks;
}

/**
 * Calculates contribution heatmap intensity level (0-4) based on watch time vs daily target.
 *
 * @param {number|object} sec - Seconds watched on this day, or bucket object
 * @param {number} targetSec - Daily target in seconds
 * @returns {number|string} Level from 0 to 4, or 'practice'
 */
export function intensity(sec, targetSec = 5400) {
  if (!sec) return 0;
  if (typeof sec === 'object') {
    if (sec.isPractice) return 'practice';
    sec = sec.watchedSec || 0;
  }
  if (!sec) return 0;
  const ratio = sec / targetSec;
  if (ratio >= 1) return 4;
  if (ratio >= 0.66) return 3;
  if (ratio >= 0.33) return 2;
  return 1;
}
