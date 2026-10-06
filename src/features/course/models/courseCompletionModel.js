/**
 * Course Completion Domain Model (Pure Business Logic)
 *
 * Manages the "Mark as Complete" flow:
 * - 90% threshold → show banner + generate 8-digit PIN
 * - PIN verification gate before proceeding
 * - Milestone motivational messages at 90%, 95%, 99%, 100%
 * - Final auto-completion when user reaches 100%
 *
 * State machine:
 *   in_progress → verification_pending (PIN sent) → verification_completed → completed (100%)
 */

// ── localStorage keys (namespaced per course) ──────────────────────────
export const COMPLETION_KEY_PREFIX = 'jct_completion__';

// ── Status enum ────────────────────────────────────────────────────────
export const COMPLETION_STATUS = {
  IN_PROGRESS: 'in_progress',
  VERIFICATION_PENDING: 'verification_pending',
  VERIFICATION_COMPLETED: 'verification_completed',
  COMPLETED: 'completed',
};

// ── Milestone messages ─────────────────────────────────────────────────
export const MILESTONE_MESSAGES = {
  90: {
    emoji: '🎉',
    title: "You're almost there!",
    body: "You've completed 90% of the course. Just a little more to go — finish the final 10% and unlock your course completion!",
    cta: 'Mark as Complete',
  },
  95: {
    emoji: '🚀',
    title: 'Final sprint!',
    body: "95% done — you're in the home stretch! Only a handful of lectures remain between you and full mastery.",
    cta: 'Mark as Complete',
  },
  99: {
    emoji: '⚡',
    title: 'One lecture away!',
    body: "99% complete — you're literally one step from the finish line. Don't stop now!",
    cta: 'Mark as Complete',
  },
  100: {
    emoji: '🏆',
    title: 'Course Completed!',
    body: 'Incredible dedication! You have officially completed 100% of the course. You are now certified job-ready!',
    cta: 'Celebrate 🎓',
  },
};

/**
 * Determines which milestone message to show based on current percentage.
 * Returns the milestone object or null if pct is below 90%.
 */
export function getMilestoneForPct(pct) {
  if (pct >= 100) return { pct: 100, ...MILESTONE_MESSAGES[100] };
  if (pct >= 99) return { pct: 99, ...MILESTONE_MESSAGES[99] };
  if (pct >= 95) return { pct: 95, ...MILESTONE_MESSAGES[95] };
  if (pct >= 90) return { pct: 90, ...MILESTONE_MESSAGES[90] };
  return null;
}

// ── PIN generation & verification ──────────────────────────────────────

/**
 * Generates a cryptographically random 8-digit PIN string.
 * Falls back to Math.random if crypto API unavailable.
 */
export function generateCompletionPin() {
  try {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      return String(arr[0] % 100000000).padStart(8, '0');
    }
  } catch {
    // fallback below
  }
  return String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
}

/**
 * Validates an entered PIN against the expected PIN.
 * Returns { valid: boolean, error?: string }.
 */
export function verifyCompletionPin(enteredPin, expectedPin) {
  if (!enteredPin || typeof enteredPin !== 'string') {
    return { valid: false, error: 'Please enter the 8-digit verification PIN.' };
  }
  const cleaned = enteredPin.replace(/\s+/g, '');
  if (cleaned.length !== 8 || !/^\d{8}$/.test(cleaned)) {
    return { valid: false, error: 'PIN must be exactly 8 digits.' };
  }
  if (cleaned !== expectedPin) {
    return { valid: false, error: 'Incorrect PIN. Please check and try again.' };
  }
  return { valid: true };
}

// ── Persistent state management ────────────────────────────────────────

/**
 * Returns the stored completion state for a given course.
 */
export function getCompletionState(courseId) {
  if (!courseId || typeof localStorage === 'undefined') {
    return createDefaultState();
  }
  try {
    const raw = localStorage.getItem(COMPLETION_KEY_PREFIX + courseId);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw);
    return { ...createDefaultState(), ...parsed };
  } catch {
    return createDefaultState();
  }
}

/**
 * Persists completion state for a course.
 */
export function saveCompletionState(courseId, state) {
  if (!courseId || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(COMPLETION_KEY_PREFIX + courseId, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

/**
 * Creates a default (empty) completion state.
 */
export function createDefaultState() {
  return {
    status: COMPLETION_STATUS.IN_PROGRESS,
    pin: null,
    pinGeneratedAt: null,
    verifiedAt: null,
    completedAt: null,
    dismissedMilestones: [], // milestones the user has dismissed (won't re-show)
  };
}

/**
 * Initiates the completion verification process.
 * Generates a PIN and transitions status to VERIFICATION_PENDING.
 */
export function initiateVerification(courseId) {
  const state = getCompletionState(courseId);
  const pin = generateCompletionPin();
  const updated = {
    ...state,
    status: COMPLETION_STATUS.VERIFICATION_PENDING,
    pin,
    pinGeneratedAt: new Date().toISOString(),
  };
  saveCompletionState(courseId, updated);
  return updated;
}

/**
 * Attempts PIN verification. On success, transitions to VERIFICATION_COMPLETED.
 * Returns { success: boolean, error?: string, state: CompletionState }.
 */
export function attemptPinVerification(courseId, enteredPin) {
  const state = getCompletionState(courseId);
  if (!state.pin) {
    return { success: false, error: 'No PIN has been generated. Start the verification first.', state };
  }
  const result = verifyCompletionPin(enteredPin, state.pin);
  if (!result.valid) {
    return { success: false, error: result.error, state };
  }
  const updated = {
    ...state,
    status: COMPLETION_STATUS.VERIFICATION_COMPLETED,
    verifiedAt: new Date().toISOString(),
    pin: null, // clear PIN after successful verification
  };
  saveCompletionState(courseId, updated);
  return { success: true, state: updated };
}

/**
 * Marks a course as officially completed (100%).
 * Should only be called when pct === 100.
 */
export function markCourseCompleted(courseId) {
  const state = getCompletionState(courseId);
  const updated = {
    ...state,
    status: COMPLETION_STATUS.COMPLETED,
    completedAt: new Date().toISOString(),
    pin: null,
  };
  saveCompletionState(courseId, updated);
  return updated;
}

/**
 * Records that a milestone banner has been dismissed by the user.
 */
export function dismissMilestone(courseId, milestonePct) {
  const state = getCompletionState(courseId);
  const dismissed = new Set(state.dismissedMilestones || []);
  dismissed.add(milestonePct);
  const updated = { ...state, dismissedMilestones: [...dismissed] };
  saveCompletionState(courseId, updated);
  return updated;
}

/**
 * Determines if a completion banner should be visible.
 * Returns { show: boolean, milestone, status, completionState }.
 */
export function evaluateCompletionBanner(courseId, pct) {
  let state = getCompletionState(courseId);
  const milestone = getMilestoneForPct(pct);

  // Below 90% — nothing to show
  if (!milestone) {
    return { show: false, milestone: null, status: state.status, completionState: state };
  }

  // Course should only be officially marked completed when pct is 100%
  if (pct >= 100) {
    if (state.status !== COMPLETION_STATUS.COMPLETED) {
      state = markCourseCompleted(courseId);
    }
    const dismissed = new Set(state.dismissedMilestones || []);
    if (dismissed.has(100)) {
      return { show: false, milestone, status: state.status, completionState: state };
    }
    return { show: true, milestone, status: state.status, completionState: state };
  }

  // If pct < 100 but status was somehow recorded as COMPLETED, revert to VERIFICATION_COMPLETED
  if (state.status === COMPLETION_STATUS.COMPLETED) {
    state = { ...state, status: COMPLETION_STATUS.VERIFICATION_COMPLETED, completedAt: null };
    saveCompletionState(courseId, state);
  }

  // Check if this milestone was dismissed
  const dismissed = new Set(state.dismissedMilestones || []);
  if (dismissed.has(milestone.pct) && state.status === COMPLETION_STATUS.IN_PROGRESS) {
    return { show: false, milestone, status: state.status, completionState: state };
  }

  // Show the banner
  return { show: true, milestone, status: state.status, completionState: state };
}

/**
 * Resets completion state for a course (used when resetting all progress).
 */
export function resetCompletionState(courseId) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(COMPLETION_KEY_PREFIX + courseId);
  } catch {
    // ignore
  }
}
