import { useEffect, useMemo } from 'react';
import { useMotivationViewModel } from '../viewmodels/useMotivationViewModel.js';
import { generatePersonalizedInsights } from '../../tracking/models/personalizedInsightsModel.js';
import './MotivationPopup.css';

export default function MotivationPopup({
  today,
  stats,
  streak,
  courseTitle,
  trackingStore,
  settings,
  history,
  viewModel,
}) {
  const internalVm = useMotivationViewModel({ today, stats, streak, courseTitle });
  const vm = viewModel || internalVm;

  const aiPersonalization = settings?.aiPersonalization !== false;

  const insights = useMemo(() => {
    if (!aiPersonalization) return null;
    return generatePersonalizedInsights({
      dailyLog: trackingStore?.dailyLog || {},
      history: history || {},
      pct: stats?.pct || 0,
      watchedCount: stats?.watchedCount || 0,
      totalCount: stats?.totalCount || 0,
      streak: streak || 0,
      remainingSec: stats?.remainingSec || 0,
      today,
      courseTitle: courseTitle || 'Core Java + AI',
      aiPersonalization: true,
    });
  }, [trackingStore, history, stats, streak, today, courseTitle, aiPersonalization]);

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
          {vm.isAiGenerated ? (
            <span className="motivation-card__ai-tag">AI Powered</span>
          ) : aiPersonalization ? (
            <span className="motivation-card__ai-tag motivation-card__ai-tag--local">Local AI</span>
          ) : null}
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

        {/* Personalized Local Guidance (What to do next, What to avoid, Focus on) */}
        {insights && insights.enabled && (
          <div className="motivation-card__insights">
            <div className="motivation-card__insights-head">
              <span className="motivation-card__insights-pill">AI Coach Guidance</span>
              <span className="motivation-card__insights-sub">Analyzed from your local progress</span>
            </div>

            <div className="motivation-card__guidance-list">
              {insights.whatNext && (
                <div className="motivation-card__guidance-item motivation-card__guidance-item--next">
                  <div className="motivation-card__guidance-head">
                    <span className="motivation-card__guidance-badge motivation-card__guidance-badge--next">Next Step</span>
                  </div>
                  <p className="motivation-card__guidance-body">{insights.whatNext}</p>
                </div>
              )}

              {insights.whatToAvoid && (
                <div className="motivation-card__guidance-item motivation-card__guidance-item--avoid">
                  <div className="motivation-card__guidance-head">
                    <span className="motivation-card__guidance-badge motivation-card__guidance-badge--avoid">What to Avoid</span>
                  </div>
                  <p className="motivation-card__guidance-body">{insights.whatToAvoid}</p>
                </div>
              )}

              {insights.focusOn && (
                <div className="motivation-card__guidance-item motivation-card__guidance-item--focus">
                  <div className="motivation-card__guidance-head">
                    <span className="motivation-card__guidance-badge motivation-card__guidance-badge--focus">Focus On</span>
                  </div>
                  <p className="motivation-card__guidance-body">{insights.focusOn}</p>
                </div>
              )}
            </div>

            {insights.recommendations && insights.recommendations.length > 0 && (
              <div className="motivation-card__tip">
                <span className="motivation-card__tip-icon">💡</span>
                <span className="motivation-card__tip-text">
                  <strong>Recommendation:</strong> {insights.recommendations[0].text}
                </span>
              </div>
            )}
          </div>
        )}

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
