/**
 * Personalized Insights Model (Local "AI" Engine)
 * 100% offline — analyzes localStorage history to generate personalized
 * recommendations, focus areas, and contextual progress messages.
 *
 * No external API calls. Uses pattern analysis on local data.
 */

import { formatSecToHHMM, getLast7DaysStats, computeCompletionSpeed } from './learningTrackerModel.js';

/**
 * Analyzes the user's learning history and generates personalized insights.
 *
 * @param {object} params
 * @param {object} params.dailyLog - tracking daily log
 * @param {object} params.history - course history (streak data)
 * @param {number} params.pct - course completion percentage
 * @param {number} params.watchedCount
 * @param {number} params.totalCount
 * @param {number} params.streak
 * @param {number} params.remainingSec
 * @param {string} params.today
 * @param {string} params.courseTitle
 * @param {boolean} params.aiPersonalization - user consent flag
 * @returns {object} insights
 */
export function generatePersonalizedInsights({
  dailyLog = {},
  history = {},
  pct = 0,
  watchedCount = 0,
  totalCount = 0,
  streak = 0,
  remainingSec = 0,
  today = '',
  courseTitle = 'your course',
  aiPersonalization = true,
}) {
  if (!aiPersonalization) {
    return {
      enabled: false,
      greeting: `Welcome back! Keep up the great work in ${courseTitle}.`,
      whatNext: null,
      whatToAvoid: null,
      focusOn: null,
      recommendations: [],
      pattern: null,
    };
  }

  const last7 = getLast7DaysStats(dailyLog, today);
  const activeDaysLast7 = last7.filter((d) => d.totalSec > 0).length;
  const totalSecLast7 = last7.reduce((s, d) => s + d.totalSec, 0);
  const avgSecLast7 = activeDaysLast7 > 0 ? totalSecLast7 / activeDaysLast7 : 0;

  const todayBucket = dailyLog[today] || {};
  const todayLearned = todayBucket.totalSec || 0;
  const todayLectureCount = todayBucket.lectureCount || 0;
  const yesterdayKey = getYesterdayKey(today);
  const yesterdayBucket = dailyLog[yesterdayKey] || {};
  const yesterdayLearned = yesterdayBucket.totalSec || 0;

  const speed = computeCompletionSpeed({ watchedCount, totalCount, dailyLog });

  // Determine learning pattern
  const pattern = classifyLearningPattern({
    activeDaysLast7, avgSecLast7, streak, pct, todayLearned,
  });

  // Build greeting
  const greeting = buildGreeting({ pattern, pct, streak, courseTitle, todayLearned, todayLectureCount });

  // What to do next
  const whatNext = buildWhatNext({ pct, todayLearned, yesterdayLearned, pattern, courseTitle });

  // What to avoid
  const whatToAvoid = buildWhatToAvoid({ pattern, pct, todayLearned, activeDaysLast7 });

  // Focus areas
  const focusOn = buildFocusOn({ pattern, pct, streak, courseTitle, speed });

  // Recommendations list
  const recommendations = buildRecommendations({
    pattern, pct, streak, todayLearned, activeDaysLast7, remainingSec, courseTitle,
  });

  return {
    enabled: true,
    greeting,
    whatNext,
    whatToAvoid,
    focusOn,
    recommendations,
    pattern,
    stats: {
      activeDaysLast7,
      avgSecLast7,
      avgLabelLast7: formatSecToHHMM(avgSecLast7),
      todayLearned,
      todayLearnedLabel: formatSecToHHMM(todayLearned),
      speed,
    },
  };
}

/** Classifies the user's learning pattern from their history */
function classifyLearningPattern({ activeDaysLast7, avgSecLast7, streak, pct, todayLearned }) {
  if (activeDaysLast7 >= 6 && streak >= 5) return 'consistent_high_achiever';
  if (activeDaysLast7 >= 4 && avgSecLast7 >= 3600) return 'steady_learner';
  if (activeDaysLast7 >= 3 && streak >= 3) return 'building_momentum';
  if (activeDaysLast7 === 0 && pct > 0) return 'returning_after_break';
  if (activeDaysLast7 <= 2 && pct < 20) return 'just_getting_started';
  if (todayLearned > 0 && activeDaysLast7 >= 3) return 'active_today';
  if (pct > 70) return 'approaching_finish';
  return 'needs_encouragement';
}

function buildGreeting({ pattern, pct, streak, courseTitle, todayLearned, todayLectureCount }) {
  const firstName = ''; // No personal name, keep generic but warm
  switch (pattern) {
    case 'consistent_high_achiever':
      return `🔥 ${streak}-day streak! You're one of the most consistent learners. Keep this momentum going in ${courseTitle}.`;
    case 'steady_learner':
      return `📈 You're making great steady progress — ${pct}% complete. Your consistent study sessions are paying off!`;
    case 'building_momentum':
      return `🚀 Your streak of ${streak} days shows real commitment. You're building excellent learning habits!`;
    case 'returning_after_break':
      return `👋 Welcome back! Your progress (${pct}% complete) is saved. Let's pick up right where you left off.`;
    case 'just_getting_started':
      return `🌱 Great start! The first few sessions are always the hardest. You're on your way to mastering ${courseTitle}.`;
    case 'approaching_finish':
      return `🏁 Almost there! At ${pct}% complete, the finish line is in sight. Push through to the end!`;
    case 'active_today':
      return `💪 You've already watched ${todayLectureCount} lecture${todayLectureCount !== 1 ? 's' : ''} today! Great focus — keep the energy high.`;
    default:
      return `📚 Ready to learn? Every session in ${courseTitle} brings you closer to your goal.`;
  }
}

function buildWhatNext({ pct, todayLearned, yesterdayLearned, pattern, courseTitle }) {
  if (pct >= 100) return `You've completed ${courseTitle}! Focus on building projects and reviewing challenging topics.`;
  if (pct >= 80) return `You're in the final stretch! Complete the remaining lectures and start building a capstone project.`;
  if (todayLearned === 0 && yesterdayLearned > 0) return `Continue from where you left off yesterday. Even 30 minutes of focused study today keeps momentum alive.`;
  if (todayLearned > 0) return `You've already started today — aim to hit your daily target before switching to practice exercises.`;
  if (pattern === 'returning_after_break') return `Start with a quick recap of your last watched lectures, then dive into the next section.`;
  return `Open today's plan and work through your highlighted lectures. Consistency beats intensity!`;
}

function buildWhatToAvoid({ pattern, pct, todayLearned, activeDaysLast7 }) {
  if (todayLearned >= 4 * 3600) return `Avoid marathon sessions that leave no time for reflection. Your brain needs rest to consolidate today's learning.`;
  if (activeDaysLast7 <= 1 && pct > 10) return `Avoid skipping multiple consecutive days — it breaks momentum and makes re-entry harder.`;
  if (pattern === 'just_getting_started') return `Don't rush to mark lectures complete without understanding the content. Quality over quantity.`;
  if (pct > 60) return `Don't skip practice between lectures. At this stage, hands-on coding is more important than pure lecture time.`;
  return `Avoid passive watching — pause, code along, and test your understanding after each lecture.`;
}

function buildFocusOn({ pattern, pct, streak, courseTitle, speed }) {
  if (pattern === 'consistent_high_achiever') return `Focus on deep understanding and practical application. At your pace, start building mini-projects alongside the course.`;
  if (pct > 50) return `Focus on coding exercises for every concept covered. Your study speed is good — now make sure comprehension matches your pace.`;
  if (streak === 0) return `Focus on rebuilding your daily habit. Even 20 minutes counts for your streak.`;
  if (Number(speed.lecturesPerDay) > 5) return `Focus on quality over quantity. At ${speed.lecturesPerDay} lectures/day, make sure you're absorbing each topic.`;
  return `Focus on completing your daily target consistently. ${speed.lecturesPerDay || '1-2'} lectures per day will get you to the finish line.`;
}

function buildRecommendations({ pattern, pct, streak, todayLearned, activeDaysLast7, remainingSec, courseTitle }) {
  const recs = [];

  // Always relevant
  recs.push({ icon: '💻', text: 'Practice coding after every lecture — don\'t just watch, build!' });

  if (streak === 0 || activeDaysLast7 <= 2) {
    recs.push({ icon: '🗓️', text: 'Set a fixed daily study time and stick to it. Consistency beats intensity.' });
  }

  if (pct > 30 && pct < 80) {
    recs.push({ icon: '📝', text: 'Write summary notes after each section — it strengthens long-term memory.' });
  }

  if (todayLearned >= 2 * 3600) {
    recs.push({ icon: '🧘', text: 'Take a 15-minute break — your brain is working hard. Rest improves retention.' });
  }

  if (pct >= 50) {
    recs.push({ icon: '🛠️', text: 'Start a mini-project using what you\'ve learned so far. Applied practice accelerates mastery.' });
  }

  if (remainingSec < 2 * 3600) {
    recs.push({ icon: '🏁', text: `You're very close to finishing ${courseTitle}! One final push!` });
  }

  if (pattern === 'returning_after_break') {
    recs.push({ icon: '🔄', text: 'Review the last 2-3 lectures you watched before continuing. Re-activation helps retention.' });
  }

  return recs.slice(0, 4); // Max 4 recommendations
}

function getYesterdayKey(today) {
  if (!today) return '';
  const d = new Date(today + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

