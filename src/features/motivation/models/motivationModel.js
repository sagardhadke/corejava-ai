/**
 * Curated list of 10 best motivational messages for the daily popup dialog.
 * Designed specifically for students learning Core Java, programming, and software engineering.
 */
export const DEFAULT_MOTIVATION_MESSAGES = [
  "Consistency beats intensity. Every concept you master today compounds into engineering excellence.",
  "Small daily progress compounds into career-defining results. Show up today and keep your momentum alive.",
  "The secret to mastering Java isn't talent—it's showing up every single day and writing code.",
  "Every complex architecture is built line by line, concept by concept. You're closer to job-ready today.",
  "Great engineers aren't made overnight. They are built through continuous daily focus and deliberate practice.",
  "You've built real momentum. Protect your streak today and turn effort into unstoppable confidence.",
  "Code by code, lecture by lecture. Focus on today's session and trust the learning process.",
  "The best investment you can make is in your own skills. Let's dive in and conquer today's goals.",
  "Progress isn't always loud, but showing up consistently is how breakthroughs happen. Let's write great code.",
  "Every bug you debug and every principle you learn is forging you into a confident, professional developer.",
];

/**
 * Deterministically picks a fresh motivational message based on date and current streak.
 * This ensures the user gets a rotating, variety-rich message each day even without an API key.
 *
 * @param {number} [streak=0] - Current daily streak count
 * @param {string} [dateKey=''] - Date string in 'YYYY-MM-DD' format
 * @returns {string} Selected motivational message
 */
export function pickDefaultMotivation(streak = 0, dateKey = '') {
  if (dateKey) {
    const charCodeSum = dateKey.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const idx = (charCodeSum + Math.abs(streak)) % DEFAULT_MOTIVATION_MESSAGES.length;
    return DEFAULT_MOTIVATION_MESSAGES[idx];
  }
  const idx = Math.abs(streak) % DEFAULT_MOTIVATION_MESSAGES.length;
  return DEFAULT_MOTIVATION_MESSAGES[idx];
}
