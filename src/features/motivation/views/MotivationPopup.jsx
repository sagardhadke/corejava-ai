import { useEffect } from 'react';
import { useMotivationViewModel } from '../viewmodels/useMotivationViewModel.js';
import './MotivationPopup.css';

export default function MotivationPopup({
  today,
  stats,
  streak,
  courseTitle,
  viewModel,
}) {
  const internalVm = useMotivationViewModel({ today, stats, streak, courseTitle });
  const vm = viewModel || internalVm;

  // Close on Escape key
  useEffect(() => {
    if (!vm.visible) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') vm.dismiss();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [vm.visible, vm]);

  if (!vm.visible) return null;

  return (
    <div className="motivation-overlay" onClick={vm.dismiss} role="presentation">
      <div
        className="motivation-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Daily Motivation"
      >
        <button
          type="button"
          className="motivation-card__close"
          onClick={vm.dismiss}
          aria-label="Close daily motivation"
        >
          ✕
        </button>

        <div className="motivation-card__badge">
          <SparkleIcon />
          <span>Daily Motivation</span>
          {vm.isAiGenerated && <span className="motivation-card__ai-tag">AI Powered</span>}
        </div>

        <h3 className="motivation-card__greeting">Welcome back!</h3>

        <div className="motivation-card__stats-strip">
          <div className="motivation-card__stat-item">
            <span className="motivation-card__stat-icon">🔥</span>
            <span className="motivation-card__stat-val">{streak || 0}</span>
            <span className="motivation-card__stat-lbl">Day Streak</span>
          </div>
          <div className="motivation-card__stat-divider" />
          <div className="motivation-card__stat-item">
            <span className="motivation-card__stat-icon">📊</span>
            <span className="motivation-card__stat-val">{stats?.pct || 0}%</span>
            <span className="motivation-card__stat-lbl">Completed</span>
          </div>
          <div className="motivation-card__stat-divider" />
          <div className="motivation-card__stat-item">
            <span className="motivation-card__stat-icon">🎯</span>
            <span className="motivation-card__stat-val">{stats?.watchedCount || 0}/{stats?.totalCount || 0}</span>
            <span className="motivation-card__stat-lbl">Lectures</span>
          </div>
        </div>

        <div className="motivation-card__body">
          {vm.loading ? (
            <div className="motivation-card__loading">
              <span className="motivation-card__spinner" />
              <span>Generating your personalized study message...</span>
            </div>
          ) : (
            <p className="motivation-card__text">"{vm.message}"</p>
          )}
        </div>

        <button
          type="button"
          className="motivation-card__cta"
          onClick={vm.dismiss}
        >
          Start Studying Now →
        </button>
      </div>
    </div>
  );
}

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
    </svg>
  );
}
