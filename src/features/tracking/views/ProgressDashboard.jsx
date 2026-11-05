import { useMemo } from 'react';
import {
  computeSmartETA,
  computeCompletionSpeed,
  getActivityLog,
  getLast7DaysStats,
  formatSecToHHMM,
  DAILY_LIMIT_SEC,
} from '../../tracking/models/learningTrackerModel.js';
import './ProgressDashboard.css';

/**
 * ProgressDashboard — Real-time course progress tracker displayed in Settings.
 * Shows ETA, velocity, activity log, daily heatmap, and personalized reports.
 */
export default function ProgressDashboard({
  trackingStore,
  stats,
  settings,
  today,
  courseTitle,
  startDate,
  onViewReport,
}) {
  const dailyLog = trackingStore?.dailyLog || {};
  const dailyTargetSec = (settings?.dailyTargetHours || 1.5) * 3600;

  const eta = useMemo(() => computeSmartETA({
    remainingSec: stats?.remainingSec || 0,
    dailyTargetSec,
    dailyLog,
    today,
  }), [stats?.remainingSec, dailyTargetSec, dailyLog, today]);

  const speed = useMemo(() => computeCompletionSpeed({
    watchedCount: stats?.watchedCount || 0,
    totalCount: stats?.totalCount || 0,
    dailyLog,
  }), [stats?.watchedCount, stats?.totalCount, dailyLog]);

  const last7 = useMemo(() => getLast7DaysStats(dailyLog, today), [dailyLog, today]);
  const activityLog = useMemo(() => getActivityLog(dailyLog, 7), [dailyLog]);

  const todayBucket = dailyLog[today] || {};
  const todayLearned = todayBucket.totalSec || 0;
  const todayPct = Math.min(100, Math.round((todayLearned / DAILY_LIMIT_SEC) * 100));

  const totalLearned = Object.values(dailyLog).reduce((s, b) => s + (b?.totalSec || 0), 0);

  const max7DaySec = Math.max(...last7.map((d) => d.totalSec), 1);

  const confidenceColor = {
    high: '#22c55e',
    medium: '#f59e0b',
    low: '#71717a',
  }[eta.confidence] || '#71717a';

  return (
    <div className="pd-root">
      {/* Header */}
      <div className="pd-header">
        <div className="pd-header__left">
          <ChartIcon />
          <span className="pd-header__title">Real-Time Progress Tracker</span>
        </div>
        <div className={`pd-confidence-pill pd-confidence-pill--${eta.confidence}`}>
          {eta.confidence === 'high' ? '● High accuracy' : eta.confidence === 'medium' ? '● Medium accuracy' : '● Learning…'}
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="pd-metrics">
        <div className="pd-metric">
          <span className="pd-metric__icon">📊</span>
          <span className="pd-metric__value">{stats?.pct || 0}%</span>
          <span className="pd-metric__label">Complete</span>
        </div>
        <div className="pd-metric-divider" />
        <div className="pd-metric">
          <span className="pd-metric__icon">⚡</span>
          <span className="pd-metric__value">{speed.lecturesPerDay || '—'}</span>
          <span className="pd-metric__label">Lectures/Day</span>
        </div>
        <div className="pd-metric-divider" />
        <div className="pd-metric">
          <span className="pd-metric__icon">📅</span>
          <span className="pd-metric__value">{eta.etaDays > 0 ? `${eta.etaDays}d` : '✓'}</span>
          <span className="pd-metric__label">Days Left</span>
        </div>
        <div className="pd-metric-divider" />
        <div className="pd-metric">
          <span className="pd-metric__icon">⏱️</span>
          <span className="pd-metric__value">{formatSecToHHMM(totalLearned)}</span>
          <span className="pd-metric__label">Total Learned</span>
        </div>
      </div>

      {/* ETA Card */}
      <div className="pd-eta-card">
        <div className="pd-eta-card__row">
          <div className="pd-eta-card__left">
            <span className="pd-eta-card__label">Estimated completion</span>
            <span className="pd-eta-card__date">{eta.etaDateStr || 'Calculating…'}</span>
          </div>
          <div className="pd-eta-card__right">
            <span className="pd-eta-card__method" style={{ color: confidenceColor }}>
              {eta.method === 'velocity' ? '🧠 Based on your actual pace' : '🎯 Based on target setting'}
            </span>
            {eta.velocityLabel && (
              <span className="pd-eta-card__velocity">
                Avg: {eta.velocityLabel}/day
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Today's Progress */}
      <div className="pd-today">
        <div className="pd-today__header">
          <span className="pd-today__title">Today's Learning</span>
          <span className="pd-today__value">{formatSecToHHMM(todayLearned)} / 5h cap</span>
        </div>
        <div className="pd-today__bar-wrap">
          <div className="pd-today__bar">
            <div
              className={`pd-today__bar-fill ${todayPct >= 100 ? 'pd-today__bar-fill--full' : ''}`}
              style={{ width: `${todayPct}%` }}
            />
          </div>
          <span className="pd-today__pct">{todayPct}%</span>
        </div>
        {todayBucket.lectureCount > 0 && (
          <span className="pd-today__count">
            {todayBucket.lectureCount} lecture{todayBucket.lectureCount !== 1 ? 's' : ''} watched today
          </span>
        )}
      </div>

      {/* 7-Day Sparkline */}
      <div className="pd-sparkline">
        <div className="pd-sparkline__header">
          <span className="pd-sparkline__title">Last 7 Days Activity</span>
        </div>
        <div className="pd-sparkline__bars">
          {last7.map((day) => {
            const h = max7DaySec > 0 ? (day.totalSec / max7DaySec) * 100 : 0;
            const isToday = day.date === today;
            const dow = new Date(day.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 1);
            return (
              <div key={day.date} className="pd-sparkline__col">
                <div className="pd-sparkline__bar-wrap">
                  <div
                    className={`pd-sparkline__bar ${isToday ? 'pd-sparkline__bar--today' : ''} ${day.totalSec === 0 ? 'pd-sparkline__bar--zero' : ''}`}
                    style={{ height: `${Math.max(h, 4)}%` }}
                    title={`${day.date}: ${formatSecToHHMM(day.totalSec)}`}
                  />
                </div>
                <span className={`pd-sparkline__label ${isToday ? 'pd-sparkline__label--today' : ''}`}>{dow}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity Log */}
      {activityLog.length > 0 && (
        <div className="pd-activity">
          <div className="pd-activity__header">
            <ClockIcon />
            <span>Daily Learning Log</span>
          </div>
          <div className="pd-activity__list">
            {activityLog.slice(0, 5).map((day) => (
              <div key={day.date} className="pd-activity__row">
                <div className="pd-activity__row-left">
                  <span className="pd-activity__dot" style={{
                    background: day.limitReached ? '#ef4444' : day.totalSec >= 3600 ? '#22c55e' : '#f59e0b'
                  }} />
                  <span className="pd-activity__date">
                    {new Date(day.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="pd-activity__row-right">
                  <span className="pd-activity__duration">{formatSecToHHMM(day.totalSec)}</span>
                  <span className="pd-activity__count">{day.lectureCount} lectures</span>
                  {day.limitReached && <span className="pd-activity__limit-tag">Cap</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Speed Stats */}
      {speed.activeDays > 0 && (
        <div className="pd-speed-row">
          <div className="pd-speed-item">
            <span className="pd-speed-item__val">{speed.activeDays}</span>
            <span className="pd-speed-item__label">Active days</span>
          </div>
          <div className="pd-speed-item">
            <span className="pd-speed-item__val">{speed.pctPerDay}%</span>
            <span className="pd-speed-item__label">Progress/day</span>
          </div>
          <div className="pd-speed-item">
            <span className="pd-speed-item__val">{formatSecToHHMM(eta.velocitySec || 0)}</span>
            <span className="pd-speed-item__label">Avg velocity</span>
          </div>
        </div>
      )}

      {/* View full report button */}
      {onViewReport && (
        <button className="pd-report-btn" onClick={onViewReport} type="button">
          <ReportIcon />
          View Full Progress Report →
        </button>
      )}
    </div>
  );
}

function ChartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="12" y1="20" x2="12" y2="4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="6" y1="20" x2="6" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="10" y1="9" x2="8" y2="9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

