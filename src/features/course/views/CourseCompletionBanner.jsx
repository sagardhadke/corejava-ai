import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  COMPLETION_STATUS,
  evaluateCompletionBanner,
  initiateVerification,
  attemptPinVerification,
  dismissMilestone,
} from '../models/courseCompletionModel.js';
import { showToast } from '../../../utils/toast.js';
import { addNotification, NOTIFICATION_TYPES } from '../../notifications/models/notificationModel.js';
import './CourseCompletion.css';

// ── Progress Ring (SVG circular progress 90%→100%) ───────────────────
function ProgressRing({ pct }) {
  const radius = 38;
  const stroke = 6;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  // Map 90-100% into a 0-100% visual fill
  const visualPct = Math.min(100, Math.max(0, ((pct - 90) / 10) * 100));
  const offset = circumference - (visualPct / 100) * circumference;

  return (
    <div className="completion-progress-ring">
      <svg
        className="completion-progress-ring__svg"
        width={radius * 2}
        height={radius * 2}
      >
        <defs>
          <linearGradient id="completionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffb800" />
            <stop offset="60%" stopColor="#ffd54a" />
            <stop offset="100%" stopColor="#4ade80" />
          </linearGradient>
        </defs>
        <circle
          className="completion-progress-ring__bg"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          className="completion-progress-ring__fill"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="completion-progress-ring__center">
        <span className="completion-progress-ring__pct">{pct}%</span>
        <span className="completion-progress-ring__label">done</span>
      </div>
    </div>
  );
}

// ── PIN Verification Modal ───────────────────────────────────────────
function PinVerificationModal({ pin, courseId, courseTitle, onClose, onVerified }) {
  const [enteredPin, setEnteredPin] = useState('');
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleCopyPin = () => {
    if (!pin) return;
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(pin);
      }
    } catch {
      // fallback
    }
    setCopied(true);
    showToast('PIN copied to clipboard! 📋', 'info', 2000);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuickFill = () => {
    if (!pin) return;
    setEnteredPin(pin);
    setError('');
  };

  const handleVerify = useCallback(() => {
    const result = attemptPinVerification(courseId, enteredPin);
    if (result.success) {
      setVerified(true);
      setError('');
      showToast('✅ PIN verified successfully! Finish remaining lectures to reach 100%!', 'success', 5000);
      addNotification({
        type: NOTIFICATION_TYPES.ACHIEVEMENT,
        title: 'Completion Verification Passed! ✅',
        message: `You verified your completion PIN for ${courseTitle}. Finish the remaining lectures to officially complete the course!`,
        actionType: 'open_badges',
        meta: { courseId, verifiedAt: new Date().toISOString() },
      });
      if (typeof onVerified === 'function') onVerified(result.state);
    } else {
      setError(result.error);
    }
  }, [courseId, courseTitle, enteredPin, onVerified]);

  const handleInputChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 8);
    setEnteredPin(val);
    if (error) setError('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && enteredPin.length === 8) {
      handleVerify();
    }
  };

  // Render PIN digits for display
  const pinDigits = pin ? pin.split('') : [];

  return (
    <div className="pin-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="pin-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="PIN Verification"
      >
        <button
          type="button"
          className="pin-modal__close"
          onClick={onClose}
          aria-label="Close verification"
        >
          ✕
        </button>

        {verified ? (
          /* ── Success State ── */
          <div className="pin-modal__success">
            <div className="pin-modal__success-icon">✅</div>
            <div className="pin-modal__success-title">Verification Complete!</div>
            <div className="pin-modal__success-desc">
              Your completion verification for <strong>{courseTitle}</strong> has been confirmed.
              Complete the remaining lectures to officially reach 100% completion and earn your final certificate badge!
            </div>
            <button
              type="button"
              className="pin-modal__btn--done"
              onClick={onClose}
            >
              Continue Studying →
            </button>
          </div>
        ) : (
          /* ── Verification Form ── */
          <>
            <div className="pin-modal__icon">🔐</div>
            <h3 className="pin-modal__title">Verify Course Completion</h3>
            <p className="pin-modal__desc">
              Enter the 8-digit PIN shown below to verify your identity and initiate the course completion process.
            </p>

            <div className="pin-modal__why">
              <strong>Why is verification required?</strong><br />
              PIN verification confirms your intention to complete the course and ensures the integrity of your verified achievement certificate.
            </div>

            {/* PIN Display */}
            <div className="pin-modal__pin-display">
              {pinDigits.slice(0, 4).map((d, i) => (
                <div key={`d1-${i}`} className="pin-modal__pin-digit">{d}</div>
              ))}
              <div className="pin-modal__pin-separator" />
              {pinDigits.slice(4).map((d, i) => (
                <div key={`d2-${i}`} className="pin-modal__pin-digit">{d}</div>
              ))}
            </div>

            {/* PIN Helper buttons */}
            <div className="pin-modal__pin-helpers">
              <button
                type="button"
                className="pin-helper-btn"
                onClick={handleCopyPin}
                title="Copy PIN to clipboard"
              >
                {copied ? '✓ Copied' : '📋 Copy PIN'}
              </button>
              <button
                type="button"
                className="pin-helper-btn"
                onClick={handleQuickFill}
                title="Auto-fill PIN into the input below"
              >
                ⚡ Quick Fill
              </button>
            </div>

            {/* PIN Input */}
            <div className="pin-modal__input-group">
              <label className="pin-modal__input-label">Enter 8-Digit Verification PIN</label>
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="\d{8}"
                maxLength={8}
                className={`pin-modal__input ${error ? 'pin-modal__input--error' : ''}`}
                value={enteredPin}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="00000000"
                autoComplete="off"
              />
              {error && <div className="pin-modal__error">{error}</div>}
            </div>

            <div className="pin-modal__actions">
              <button
                type="button"
                className="pin-modal__btn pin-modal__btn--cancel"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="pin-modal__btn pin-modal__btn--verify"
                onClick={handleVerify}
                disabled={enteredPin.length !== 8}
              >
                Verify PIN
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Course Completion Banner ─────────────────────────────────────────
export default function CourseCompletionBanner({ courseId, pct, stats, courseTitle }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const bannerState = useMemo(() => {
    void refreshKey;
    return evaluateCompletionBanner(courseId, pct);
  }, [courseId, pct, refreshKey]);
  const [showPinModal, setShowPinModal] = useState(false);
  const [currentPin, setCurrentPin] = useState(null);

  const handleInitiateVerification = useCallback(() => {
    const state = initiateVerification(courseId);
    setCurrentPin(state.pin);
    setShowPinModal(true);
    setRefreshKey((k) => k + 1);
    addNotification({
      type: NOTIFICATION_TYPES.SYSTEM,
      title: 'Course Completion PIN Generated 🔐',
      message: `Your 8-digit verification PIN is: ${state.pin}. Enter this PIN to verify your completion request for ${courseTitle || 'the course'}.`,
      actionType: 'open_completion',
      meta: { courseId, pin: state.pin },
    });
  }, [courseId, courseTitle]);

  // Allow other components to trigger the PIN modal (e.g. StatsBar or CommandPalette)
  useEffect(() => {
    const onTrigger = () => {
      if (pct >= 90) {
        handleInitiateVerification();
      }
    };
    window.addEventListener('jct:open_completion_modal', onTrigger);
    return () => window.removeEventListener('jct:open_completion_modal', onTrigger);
  }, [pct, handleInitiateVerification]);

  const handleDismiss = useCallback(() => {
    if (bannerState.milestone) {
      dismissMilestone(courseId, bannerState.milestone.pct);
      setRefreshKey((k) => k + 1);
    }
  }, [courseId, bannerState.milestone]);

  const handleVerified = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowPinModal(false);
    setCurrentPin(null);
    setRefreshKey((k) => k + 1);
  }, []);

  if (!bannerState.show || !bannerState.milestone) return null;

  const { milestone, status } = bannerState;
  const remainingCount = (stats?.totalCount || 0) - (stats?.watchedCount || 0);
  const isCompleted = status === COMPLETION_STATUS.COMPLETED;
  const isVerified = status === COMPLETION_STATUS.VERIFICATION_COMPLETED;

  return (
    <>
      <div className={`completion-banner ${isCompleted ? 'completion-banner--completed' : ''}`}
           id="completion-banner">
        {/* Dismiss button (not shown on 100% completed) */}
        {!isCompleted && (
          <button
            type="button"
            className="completion-banner__dismiss"
            onClick={handleDismiss}
            aria-label="Dismiss banner"
            title="Dismiss"
          >
            ✕
          </button>
        )}

        {/* Completed badge */}
        {isCompleted && (
          <div className="completion-banner__completed-badge">
            🎓 Course Officially Completed
          </div>
        )}

        {/* Verified status */}
        {isVerified && !isCompleted && (
          <div className="completion-banner__status">
            <span className="completion-banner__status-dot" />
            Verification Completed — Finish remaining lectures to complete
          </div>
        )}

        {/* Header */}
        <div className="completion-banner__header">
          <span className="completion-banner__emoji">{milestone.emoji}</span>
          <h3 className="completion-banner__title">{milestone.title}</h3>
        </div>

        {/* Body */}
        <p className="completion-banner__body">{milestone.body}</p>

        {/* Progress Section (90% → 100%) */}
        {!isCompleted && (
          <div className="completion-banner__progress-section">
            <ProgressRing pct={pct} />
            <div className="completion-progress-info">
              <div className="completion-progress-info__remaining">
                <strong>{remainingCount}</strong> lecture{remainingCount !== 1 ? 's' : ''} remaining to reach 100%
              </div>
              <div className="completion-progress-bar">
                <div
                  className="completion-progress-bar__fill"
                  style={{ width: `${Math.min(100, ((pct - 90) / 10) * 100)}%` }}
                />
              </div>
              <div className="completion-progress-bar__labels">
                <span>90%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="completion-banner__actions">
          {isCompleted ? (
            <button
              type="button"
              className="completion-banner__cta completion-banner__cta--gold"
              onClick={() => showToast('🎓 Congratulations! You are a certified champion!', 'success', 5000)}
            >
              🏆 Course Champion
            </button>
          ) : isVerified ? (
            <button
              type="button"
              className="completion-banner__cta completion-banner__cta--secondary"
              disabled
            >
              ✅ Verification Complete — Finish remaining {remainingCount} lecture{remainingCount !== 1 ? 's' : ''}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="completion-banner__cta completion-banner__cta--primary"
                id="mark-as-complete-btn"
                onClick={handleInitiateVerification}
              >
                ✓ Mark as Complete
              </button>
              <button
                type="button"
                className="completion-banner__cta completion-banner__cta--secondary"
                onClick={handleDismiss}
              >
                Complete the remaining {remainingCount} first
              </button>
            </>
          )}
        </div>
      </div>

      {/* PIN Verification Modal */}
      {showPinModal && currentPin && (
        <PinVerificationModal
          pin={currentPin}
          courseId={courseId}
          courseTitle={courseTitle || 'Core Java'}
          onClose={handleCloseModal}
          onVerified={handleVerified}
        />
      )}
    </>
  );
}
