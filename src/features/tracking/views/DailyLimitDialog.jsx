import { buildLimitDialogContent } from '../models/dailyLimitModel.js';
import './DailyLimitDialog.css';

/**
 * DailyLimitDialog — Professional "5h daily cap reached" modal.
 * Shows personalized advice and locks remaining course content.
 */
export default function DailyLimitDialog({ gate, courseTitle, onClose, onViewProgress }) {
  if (!gate) return null;

  const content = buildLimitDialogContent(gate, courseTitle);

  return (
    <div className="dlimit-overlay" role="presentation" onClick={onClose}>
      <div
        className="dlimit-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Daily Learning Limit"
      >
        {/* Close button */}
        <button
          type="button"
          className="dlimit-card__close"
          onClick={onClose}
          aria-label="Close daily limit dialog"
        >
          ✕
        </button>

        {/* Header */}
        <div className="dlimit-header">
          <div className="dlimit-header__badge">
            <LockIcon />
            <span>Daily Learning Limit</span>
          </div>
          <h2 className="dlimit-header__headline">{content.headline}</h2>
          <p className="dlimit-header__sub">{content.subheadline}</p>
        </div>

        {/* Progress bar */}
        <div className="dlimit-progress-wrap">
          <div className="dlimit-progress-bar">
            <div
              className="dlimit-progress-bar__fill"
              style={{ width: `${Math.min(100, (gate.todayLearnedSec / gate.limitSec) * 100)}%` }}
            />
          </div>
          <div className="dlimit-progress-labels">
            <span className="dlimit-progress-labels__done">
              🎯 {gate.todayLearned} completed today
            </span>
            <span className="dlimit-progress-labels__limit">
              {gate.limitLabel} daily max
            </span>
          </div>
        </div>

        {/* Body message */}
        <p className="dlimit-body">{content.body}</p>

        {/* Practical advice list */}
        <div className="dlimit-advice">
          <div className="dlimit-advice__title">
            <BulbIcon />
            <span>What to do now instead:</span>
          </div>
          <ul className="dlimit-advice__list">
            {content.advice.map((item, i) => (
              <li key={i} className="dlimit-advice__item">{item}</li>
            ))}
          </ul>
        </div>

        {/* Tomorrow notice */}
        <div className="dlimit-tomorrow">
          <CalendarIcon />
          <span>{content.tomorrow}</span>
        </div>

        {/* CTA Buttons */}
        <div className="dlimit-actions">
          <button
            type="button"
            className="dlimit-btn dlimit-btn--primary"
            onClick={onClose}
          >
            {content.ctaLabel}
          </button>
          {onViewProgress && (
            <button
              type="button"
              className="dlimit-btn dlimit-btn--secondary"
              onClick={() => { onClose(); onViewProgress(); }}
            >
              {content.ctaSecondary}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function BulbIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M9 21h6m-3-18a7 7 0 0 0-7 7c0 2.5 1.3 4.7 3.3 6H14.7c2-1.3 3.3-3.5 3.3-6a7 7 0 0 0-7-7z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
