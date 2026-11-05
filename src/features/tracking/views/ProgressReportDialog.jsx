import {
  computeSmartETA,
  computeCompletionSpeed,
  getActivityLog,
  formatSecToHHMM,
  DAILY_LIMIT_SEC,
} from '../../tracking/models/learningTrackerModel.js';
import { generatePersonalizedInsights } from '../../tracking/models/personalizedInsightsModel.js';
import './ProgressReportDialog.css';

/**
 * ProgressReportDialog — Full personalized progress report modal.
 * Shows complete learning analysis with recommendations and ETA.
 */
export default function ProgressReportDialog({
  open,
  onClose,
  trackingStore,
  stats,
  settings,
  history,
  today,
  courseTitle,
  startDate,
  streak,
}) {
  if (!open) return null;

  const dailyLog = trackingStore?.dailyLog || {};
  const dailyTargetSec = (settings?.dailyTargetHours || 1.5) * 3600;
  const aiPersonalization = settings?.aiPersonalization !== false;

  const eta = computeSmartETA({
    remainingSec: stats?.remainingSec || 0,
    dailyTargetSec,
    dailyLog,
    today,
  });

  const speed = computeCompletionSpeed({
    watchedCount: stats?.watchedCount || 0,
    totalCount: stats?.totalCount || 0,
    dailyLog,
  });

  const activityLog = getActivityLog(dailyLog, 14);

  const insights = generatePersonalizedInsights({
    dailyLog,
    history,
    pct: stats?.pct || 0,
    watchedCount: stats?.watchedCount || 0,
    totalCount: stats?.totalCount || 0,
    streak,
    remainingSec: stats?.remainingSec || 0,
    today,
    courseTitle,
    aiPersonalization,
  });

  const totalLearned = Object.values(dailyLog).reduce((s, b) => s + (b?.totalSec || 0), 0);
  const activeDaysTotal = Object.values(dailyLog).filter((b) => b?.totalSec > 0).length;
  const cappedDays = Object.values(dailyLog).filter((b) => b?.limitReached).length;

  return (
    <div className="prr-overlay" role="presentation" onClick={onClose}>
      <div
        className="prr-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Progress Report"
      >
        {/* Header */}
        <div className="prr-modal__head">
          <div className="prr-modal__head-left">
            <div className="prr-badge">
              <ReportIcon />
              <span>Personalized Progress Report</span>
            </div>
            <h2 className="prr-title">{courseTitle || 'Course Progress'}</h2>
            <p className="prr-subtitle">
              Generated {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} · All data local
            </p>
          </div>
          <button className="prr-close" onClick={onClose} aria-label="Close report">✕</button>
        </div>

        <div className="prr-body">
          {/* AI Greeting */}
          {aiPersonalization && insights.greeting && (
            <div className="prr-greeting">
              <SparkleIcon />
              <span>{insights.greeting}</span>
            </div>
          )}

          {/* Stats Grid */}
          <div className="prr-stats-grid">
            <div className="prr-stat-card prr-stat-card--highlight">
              <span className="prr-stat-card__icon">📊</span>
              <span className="prr-stat-card__val">{stats?.pct || 0}%</span>
              <span className="prr-stat-card__lbl">Course Complete</span>
            </div>
            <div className="prr-stat-card">
              <span className="prr-stat-card__icon">📚</span>
              <span className="prr-stat-card__val">{stats?.watchedCount || 0}/{stats?.totalCount || 0}</span>
              <span className="prr-stat-card__lbl">Lectures Done</span>
            </div>
            <div className="prr-stat-card">
              <span className="prr-stat-card__icon">⏱️</span>
              <span className="prr-stat-card__val">{formatSecToHHMM(totalLearned)}</span>
              <span className="prr-stat-card__lbl">Total Learned</span>
            </div>
            <div className="prr-stat-card">
              <span className="prr-stat-card__icon">🗓️</span>
              <span className="prr-stat-card__val">{activeDaysTotal}</span>
              <span className="prr-stat-card__lbl">Active Days</span>
            </div>
            <div className="prr-stat-card">
              <span className="prr-stat-card__icon">⚡</span>
              <span className="prr-stat-card__val">{speed.lecturesPerDay || '—'}</span>
              <span className="prr-stat-card__lbl">Lectures/Day</span>
            </div>
            <div className="prr-stat-card">
              <span className="prr-stat-card__icon">🔥</span>
              <span className="prr-stat-card__val">{streak || 0}</span>
              <span className="prr-stat-card__lbl">Day Streak</span>
            </div>
          </div>

          {/* ETA Section */}
          <div className="prr-section">
            <div className="prr-section__head">
              <CalendarIcon />
              <span>Estimated Completion</span>
            </div>
            <div className="prr-eta">
              <div className="prr-eta__date">{eta.etaDateStr || 'Complete!'}</div>
              <div className="prr-eta__detail">
                {eta.etaDays > 0 ? (
                  <>
                    <span>{eta.etaDays} days remaining</span>
                    <span className="prr-eta__sep">·</span>
                    <span style={{ color: { high: '#22c55e', medium: '#f59e0b', low: '#71717a' }[eta.confidence] }}>
                      {eta.confidence === 'high' ? '● High confidence' : eta.confidence === 'medium' ? '● Medium confidence' : '● Estimating…'}
                    </span>
                    <span className="prr-eta__sep">·</span>
                    <span>{eta.method === 'velocity' ? '🧠 Based on your actual pace' : '🎯 Based on target'}</span>
                  </>
                ) : (
                  <span style={{ color: '#22c55e' }}>🎓 Course complete!</span>
                )}
              </div>
              {eta.velocityLabel && (
                <div className="prr-eta__velocity">
                  Your learning velocity: <strong>{eta.velocityLabel}/day</strong>
                  {eta.method === 'target' && <span> (not enough history yet — using daily target)</span>}
                </div>
              )}
            </div>
          </div>

          {/* Personalized Insights */}
          {aiPersonalization && (
            <div className="prr-section">
              <div className="prr-section__head">
                <BrainIcon />
                <span>Personalized Analysis</span>
                <span className="prr-local-badge">LOCAL AI</span>
              </div>
              <div className="prr-insights">
                {insights.whatNext && (
                  <div className="prr-insight-row">
                    <div className="prr-insight-row__icon prr-insight-row__icon--green">▶</div>
                    <div className="prr-insight-row__content">
                      <div className="prr-insight-row__title">What to do next</div>
                      <div className="prr-insight-row__text">{insights.whatNext}</div>
                    </div>
                  </div>
                )}
                {insights.whatToAvoid && (
                  <div className="prr-insight-row">
                    <div className="prr-insight-row__icon prr-insight-row__icon--red">✕</div>
                    <div className="prr-insight-row__content">
                      <div className="prr-insight-row__title">What to avoid</div>
                      <div className="prr-insight-row__text">{insights.whatToAvoid}</div>
                    </div>
                  </div>
                )}
                {insights.focusOn && (
                  <div className="prr-insight-row">
                    <div className="prr-insight-row__icon prr-insight-row__icon--amber">◆</div>
                    <div className="prr-insight-row__content">
                      <div className="prr-insight-row__title">Focus on</div>
                      <div className="prr-insight-row__text">{insights.focusOn}</div>
                    </div>
                  </div>
                )}
              </div>
              {insights.recommendations?.length > 0 && (
                <div className="prr-recs">
                  <div className="prr-recs__title">💡 Practical Recommendations</div>
                  {insights.recommendations.map((rec, i) => (
                    <div key={i} className="prr-rec-item">
                      <span>{rec.icon}</span>
                      <span>{rec.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Daily Activity Log */}
          {activityLog.length > 0 && (
            <div className="prr-section">
              <div className="prr-section__head">
                <ClockIcon />
                <span>14-Day Activity Log</span>
                {cappedDays > 0 && (
                  <span className="prr-cap-note">{cappedDays} day{cappedDays !== 1 ? 's' : ''} at 5h cap</span>
                )}
              </div>
              <div className="prr-log">
                {activityLog.map((day) => {
                  const pct = Math.min(100, Math.round((day.totalSec / DAILY_LIMIT_SEC) * 100));
                  return (
                    <div key={day.date} className="prr-log-row">
                      <div className="prr-log-row__date">
                        {new Date(day.date + 'T00:00:00').toLocaleDateString(undefined, {
                          weekday: 'short', month: 'short', day: 'numeric'
                        })}
                        {day.date === today && <span className="prr-log-row__today-tag">Today</span>}
                      </div>
                      <div className="prr-log-row__bar-wrap">
                        <div className="prr-log-row__bar">
                          <div
                            className={`prr-log-row__fill ${day.limitReached ? 'prr-log-row__fill--cap' : day.totalSec === 0 ? 'prr-log-row__fill--zero' : ''}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="prr-log-row__right">
                        <span className="prr-log-row__dur">{formatSecToHHMM(day.totalSec)}</span>
                        <span className="prr-log-row__lec">{day.lectureCount}L</span>
                        {day.limitReached && <span className="prr-log-row__cap">CAP</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer note */}
          <p className="prr-footer-note">
            🛡️ All tracking data is stored exclusively in your browser's local storage. Nothing is sent to any server.
            {!aiPersonalization && ' Personalization is currently disabled in settings.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function SparkleIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"/></svg>;
}
function ReportIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function CalendarIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
}
function BrainIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.04-4.56 2.5 2.5 0 0 1-2.5-2.5 2.5 2.5 0 0 1 1.46-2.25A2.5 2.5 0 0 1 6.5 2h3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.04-4.56 2.5 2.5 0 0 0 2.5-2.5 2.5 2.5 0 0 0-1.46-2.25A2.5 2.5 0 0 0 17.5 2h-3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function ClockIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
}

