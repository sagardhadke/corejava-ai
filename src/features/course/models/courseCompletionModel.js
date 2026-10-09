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

// ── Cryptographic Security Constants & Functions ──────────────────────
export const PIN_EXPIRATION_MS = 15 * 60 * 1000; // 15 minutes TTL
export const MAX_PIN_ATTEMPTS = 5;               // Max incorrect attempts before lockout
export const LOCKOUT_DURATION_MS = 10 * 60 * 1000; // 10 minutes lockout

/**
 * FIPS 180-4 compliant synchronous SHA-256 implementation.
 * Produces standard 64-character lowercase hex digest.
 * Operates purely in-memory with zero external dependencies.
 */
export function sha256(str) {
  const buffer = new TextEncoder().encode(str);
  const words = [];
  for (let i = 0; i < buffer.length; i++) {
    words[i >> 2] |= (buffer[i] & 0xff) << (24 - (i % 4) * 8);
  }
  const bitLength = buffer.length * 8;
  words[bitLength >> 5] |= 0x80 << (24 - (bitLength % 32));
  words[(((bitLength + 64) >> 9) << 4) + 15] = bitLength;

  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let H0 = 0x6a09e667, H1 = 0xbb67ae85, H2 = 0x3c6ef372, H3 = 0xa54ff53a;
  let H4 = 0x510e527f, H5 = 0x9b05688c, H6 = 0x1f83d9ab, H7 = 0x5be0cd19;

  const W = new Int32Array(64);
  const len = words.length;

  for (let i = 0; i < len; i += 16) {
    for (let t = 0; t < 16; t++) W[t] = words[i + t] | 0;
    for (let t = 16; t < 64; t++) {
      const gamma0 = ((W[t-15] >>> 7) | (W[t-15] << 25)) ^ ((W[t-15] >>> 18) | (W[t-15] << 14)) ^ (W[t-15] >>> 3);
      const gamma1 = ((W[t-2] >>> 17) | (W[t-2] << 15)) ^ ((W[t-2] >>> 19) | (W[t-2] << 13)) ^ (W[t-2] >>> 10);
      W[t] = (gamma1 + W[t-7] + gamma0 + W[t-16]) | 0;
    }

    let a = H0, b = H1, c = H2, d = H3, e = H4, f = H5, g = H6, h = H7;

    for (let t = 0; t < 64; t++) {
      const sigma1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ ((~e) & g);
      const temp1 = (h + sigma1 + ch + K[t] + W[t]) | 0;
      const sigma0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (sigma0 + maj) | 0;

      h = g; g = f; f = e; e = (d + temp1) | 0; d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }

    H0 = (H0 + a) | 0; H1 = (H1 + b) | 0; H2 = (H2 + c) | 0; H3 = (H3 + d) | 0;
    H4 = (H4 + e) | 0; H5 = (H5 + f) | 0; H6 = (H6 + g) | 0; H7 = (H7 + h) | 0;
  }

  return [H0, H1, H2, H3, H4, H5, H6, H7]
    .map(val => (val >>> 0).toString(16).padStart(8, '0'))
    .join('');
}

/**
 * Generates a cryptographically random 8-digit PIN string using CSPRNG.
 */
export function generateCompletionPin() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return String(arr[0] % 100000000).padStart(8, '0');
  }
  throw new Error('Cryptographically secure RNG (crypto.getRandomValues) is required for PIN generation.');
}

/**
 * Generates a random cryptographic salt (32-char hex).
 */
export function generateCryptoSalt() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return Date.now().toString(16) + Math.random().toString(16).slice(2);
}

/**
 * Computes salted hash for PIN verification: SHA-256(pin:salt:courseId)
 */
export function computePinHash(pin, salt, courseId) {
  return sha256(`${pin}:${salt}:${courseId}`);
}

/**
 * Constant-time string equality to prevent timing attacks.
 */
export function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Validates an entered PIN format.
 * Returns { valid: boolean, error?: string, cleaned?: string }.
 */
export function validatePinFormat(enteredPin) {
  if (!enteredPin || typeof enteredPin !== 'string') {
    return { valid: false, error: 'Please enter the 8-digit verification PIN.' };
  }
  const cleaned = enteredPin.replace(/\s+/g, '');
  if (cleaned.length !== 8 || !/^\d{8}$/.test(cleaned)) {
    return { valid: false, error: 'PIN must be exactly 8 digits.' };
  }
  return { valid: true, cleaned };
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
 * SECURITY GUARANTEE: Never persists plaintext 'pin' to localStorage!
 */
export function saveCompletionState(courseId, state) {
  if (!courseId || typeof localStorage === 'undefined') return;
  try {
    // Strip plaintext PIN before persisting
    const { pin, ...secureState } = state || {};
    localStorage.setItem(COMPLETION_KEY_PREFIX + courseId, JSON.stringify(secureState));
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
    pinHash: null,
    salt: null,
    pinGeneratedAt: null,
    pinExpiresAt: null,
    failedAttempts: 0,
    lockedUntil: null,
    verifiedAt: null,
    completedAt: null,
    dismissedMilestones: [], // milestones the user has dismissed (won't re-show)
  };
}

/**
 * Initiates the completion verification process.
 * Generates CSPRNG PIN, generates cryptographic salt, computes salted SHA-256 hash.
 * Stores ONLY the hash and salt in localStorage.
 * Returns the PIN in-memory ONLY to the caller for one-time display.
 */
export function initiateVerification(courseId) {
  const state = getCompletionState(courseId);
  const pin = generateCompletionPin();
  const salt = generateCryptoSalt();
  const pinHash = computePinHash(pin, salt, courseId);
  const now = Date.now();

  const secureState = {
    ...state,
    status: COMPLETION_STATUS.VERIFICATION_PENDING,
    pinHash,
    salt,
    pinGeneratedAt: new Date(now).toISOString(),
    pinExpiresAt: new Date(now + PIN_EXPIRATION_MS).toISOString(),
    failedAttempts: 0,
    lockedUntil: null,
  };

  saveCompletionState(courseId, secureState);

  // Return the ephemeral PIN in memory only for visual display to user
  return {
    ...secureState,
    pin,
  };
}

/**
 * Attempts PIN verification against the stored cryptographic hash.
 * Enforces rate limiting, expiration TTL, and lockout.
 * On success, transitions to VERIFICATION_COMPLETED and clears hash secrets.
 * Returns { success: boolean, error?: string, state: CompletionState, locked?: boolean, expired?: boolean }.
 */
export function attemptPinVerification(courseId, enteredPin) {
  const state = getCompletionState(courseId);

  // 1. Check for lockout
  if (state.lockedUntil && new Date(state.lockedUntil).getTime() > Date.now()) {
    const remainingSec = Math.ceil((new Date(state.lockedUntil).getTime() - Date.now()) / 1000);
    const mins = Math.ceil(remainingSec / 60);
    return {
      success: false,
      error: `Too many incorrect attempts. Verification locked for ${mins} minute(s).`,
      locked: true,
      state,
    };
  }

  // 2. Check if a PIN challenge exists
  if (!state.pinHash || !state.salt) {
    return { success: false, error: 'No PIN has been generated. Start the verification first.', state };
  }

  // 3. Format validation
  const formatCheck = validatePinFormat(enteredPin);
  if (!formatCheck.valid) {
    return { success: false, error: formatCheck.error, state };
  }
  const cleaned = formatCheck.cleaned;

  // 4. Check for expiration
  if (state.pinExpiresAt && new Date(state.pinExpiresAt).getTime() < Date.now()) {
    return {
      success: false,
      error: 'Verification PIN has expired. Please generate a new PIN.',
      expired: true,
      state,
    };
  }

  // 5. Cryptographic hash comparison
  const enteredHash = computePinHash(cleaned, state.salt, courseId);
  const isMatch = constantTimeEqual(enteredHash, state.pinHash);

  if (!isMatch) {
    const failedAttempts = (state.failedAttempts || 0) + 1;
    let lockedUntil = null;
    let pinHash = state.pinHash;

    if (failedAttempts >= MAX_PIN_ATTEMPTS) {
      lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString();
      pinHash = null; // invalidate challenge
    }

    const updated = {
      ...state,
      failedAttempts,
      lockedUntil,
      pinHash,
    };
    saveCompletionState(courseId, updated);

    if (failedAttempts >= MAX_PIN_ATTEMPTS) {
      return {
        success: false,
        error: 'Too many incorrect attempts. Verification locked for 10 minutes.',
        locked: true,
        state: updated,
      };
    }

    return {
      success: false,
      error: 'Incorrect PIN. Please check and try again.',
      attemptsRemaining: MAX_PIN_ATTEMPTS - failedAttempts,
      state: updated,
    };
  }

  // 6. Verification successful! Clean up challenge secrets and update status
  const updated = {
    ...state,
    status: COMPLETION_STATUS.VERIFICATION_COMPLETED,
    verifiedAt: new Date().toISOString(),
    pin: null,
    pinHash: null,
    salt: null,
    failedAttempts: 0,
    lockedUntil: null,
    pinExpiresAt: null,
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
