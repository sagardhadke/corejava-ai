import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for Node.js test environment
class MockLocalStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(String(key), String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

globalThis.localStorage = new MockLocalStorage();

const {
  COMPLETION_STATUS,
  getCompletionState,
  initiateVerification,
  attemptPinVerification,
  dismissMilestone,
  evaluateCompletionBanner,
} = await import('../features/course/models/courseCompletionModel.js');

const {
  getNotifications,
  addNotification,
  clearAllNotifications,
  NOTIFICATION_TYPES,
} = await import('../features/notifications/models/notificationModel.js');

describe('Production Readiness: Course Completion & PIN Verification E2E Lifecycle', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    clearAllNotifications();
  });

  it('Scenario 1: Pre-90% study behavior never shows completion prompt', () => {
    const courseId = 'core-java-ai';

    for (const pct of [0, 10, 25, 50, 75, 89]) {
      const result = evaluateCompletionBanner(courseId, pct);
      assert.equal(result.show, false, `Must not show completion banner at ${pct}%`);
      assert.equal(result.milestone, null);
      assert.equal(result.status, COMPLETION_STATUS.IN_PROGRESS);
    }
  });

  it('Scenario 2: At 90% threshold, user initiates completion and receives 8-digit PIN', () => {
    const courseId = 'core-java-ai';
    const banner = evaluateCompletionBanner(courseId, 90);

    assert.equal(banner.show, true);
    assert.equal(banner.milestone.pct, 90);
    assert.equal(banner.milestone.cta, 'Mark as Complete');
    assert.equal(banner.status, COMPLETION_STATUS.IN_PROGRESS);

    // User clicks "Mark as Complete" -> initiateVerification
    const pendingState = initiateVerification(courseId);
    assert.equal(pendingState.status, COMPLETION_STATUS.VERIFICATION_PENDING);
    assert.match(pendingState.pin, /^\d{8}$/, 'Generated PIN must be exactly 8 digits');

    // System dispatches notification with PIN
    addNotification({
      type: NOTIFICATION_TYPES.SYSTEM,
      title: 'Course Completion PIN Generated 🔐',
      message: `Your 8-digit verification PIN is: ${pendingState.pin}.`,
      actionType: 'open_completion',
      meta: { courseId, pin: pendingState.pin },
    });

    const notifs = getNotifications();
    assert.equal(notifs.length, 1);
    assert.ok(notifs[0].message.includes(pendingState.pin));
  });

  it('Scenario 3: Verification gate security rejects invalid PIN attempts', () => {
    const courseId = 'core-java-ai';
    const pendingState = initiateVerification(courseId);
    const validPin = pendingState.pin;

    // Test: empty / whitespace
    assert.equal(attemptPinVerification(courseId, '').success, false);
    assert.equal(attemptPinVerification(courseId, '   ').success, false);

    // Test: wrong length
    assert.equal(attemptPinVerification(courseId, '1234').success, false);
    assert.equal(attemptPinVerification(courseId, '123456789').success, false);

    // Test: non-digits
    assert.equal(attemptPinVerification(courseId, 'abcdefgh').success, false);

    // Test: incorrect PIN
    const wrongPin = validPin === '88888888' ? '11111111' : '88888888';
    const wrongRes = attemptPinVerification(courseId, wrongPin);
    assert.equal(wrongRes.success, false);
    assert.equal(wrongRes.error, 'Incorrect PIN. Please check and try again.');

    // State must remain VERIFICATION_PENDING
    assert.equal(getCompletionState(courseId).status, COMPLETION_STATUS.VERIFICATION_PENDING);
  });

  it('Scenario 4: Valid PIN passes gate, unlocks verification, but preserves 100% completion requirement', () => {
    const courseId = 'core-java-ai';
    const pendingState = initiateVerification(courseId);
    const validPin = pendingState.pin;

    // User submits valid PIN
    const verifyRes = attemptPinVerification(courseId, validPin);
    assert.equal(verifyRes.success, true);
    assert.equal(verifyRes.state.status, COMPLETION_STATUS.VERIFICATION_COMPLETED);
    assert.equal(verifyRes.state.pin, null, 'PIN must be destroyed after verification');
    assert.ok(verifyRes.state.verifiedAt, 'verifiedAt timestamp must be recorded');
    assert.equal(verifyRes.state.completedAt, null, 'Course must NOT be marked complete yet');

    // Milestone progression: 95% -> still pre-verified, not completed
    const banner95 = evaluateCompletionBanner(courseId, 95);
    assert.equal(banner95.show, true);
    assert.equal(banner95.status, COMPLETION_STATUS.VERIFICATION_COMPLETED);
    assert.equal(getCompletionState(courseId).completedAt, null);

    // Milestone progression: 99% -> still pre-verified, not completed
    const banner99 = evaluateCompletionBanner(courseId, 99);
    assert.equal(banner99.show, true);
    assert.equal(banner99.status, COMPLETION_STATUS.VERIFICATION_COMPLETED);
    assert.equal(getCompletionState(courseId).completedAt, null);

    // Final lecture completed (100%) -> Automatically transitions to COMPLETED
    const banner100 = evaluateCompletionBanner(courseId, 100);
    assert.equal(banner100.show, true);
    assert.equal(banner100.status, COMPLETION_STATUS.COMPLETED);

    const completedState = getCompletionState(courseId);
    assert.equal(completedState.status, COMPLETION_STATUS.COMPLETED);
    assert.ok(completedState.completedAt, 'completedAt timestamp must be saved');
  });

  it('Scenario 5: Direct 100% completion without 90% manual trigger also auto-completes', () => {
    const courseId = 'fast-track-course';
    const banner = evaluateCompletionBanner(courseId, 100);
    assert.equal(banner.show, true);
    assert.equal(banner.status, COMPLETION_STATUS.COMPLETED);
    assert.equal(getCompletionState(courseId).status, COMPLETION_STATUS.COMPLETED);
  });

  it('Scenario 6: Milestone dismissal logic works cleanly', () => {
    const courseId = 'core-java-ai';
    // User at 90% dismisses banner
    dismissMilestone(courseId, 90);
    const afterDismiss = evaluateCompletionBanner(courseId, 90);
    assert.equal(afterDismiss.show, false, 'Dismissed milestone must not show if status is in_progress');

    // But progressing to 95% shows the new milestone banner
    const nextMilestone = evaluateCompletionBanner(courseId, 95);
    assert.equal(nextMilestone.show, true);
  });
});
