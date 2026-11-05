import { useState, useMemo } from 'react';
import {
  formatSecToHHMM,
  computeSmartETA,
  DAILY_LIMIT_SEC,
} from '../models/learningTrackerModel.js';
import {
  analyzeCourseBreaks,
  computeBreakAdjustedETA,
  getDetailedContentLog,
} from '../models/breakTrackerModel.js';
import './CourseProgressLogModal.css';

/**
 * CourseProgressLogModal — Comprehensive popup for self-tracking,
 * displaying exact content viewed logs with timestamps, break analysis,
 * and realistic vs fast-track completion dates.
 */
export default function CourseProgressLogModal({
  open,
  onClose,
  trackingStore,
  stats,
  settings,
  history,
  today,
  courseTitle,
  startDate,
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'content' | 'breaks' | 'daily'
  const [searchQuery, setSearchQuery] = useState('');

  const dailyLog = trackingStore?.dailyLog || {};
  const dailyTargetSec = (settings?.dailyTargetHours || 1.5) * 3600;

  // 1. Break Analysis
  const breakAnalysis = useMemo(() => {
    return analyzeCourseBreaks({
      dailyLog,
      history: history || {},
      startDate,
      today,
    });
  }, [dailyLog, history, startDate, today]);

  // 2. Smart ETA & Velocity
  const eta = useMemo(() => {
    return computeSmartETA({
      remainingSec: stats?.remainingSec || 0,
      dailyTargetSec,
      dailyLog,
      today,
    });
  }, [stats?.remainingSec, dailyTargetSec, dailyLog, today]);

  // 3. Break-Adjusted Completion Status
  const breakEta = useMemo(() => {
    return computeBreakAdjustedETA({
      remainingSec: stats?.remainingSec || 0,
      effectiveVelocity: eta.velocitySec || dailyTargetSec,
      consistencyRatio: breakAnalysis.consistencyRatio,
      today,
    });
  }, [stats?.remainingSec, eta.velocitySec, dailyTargetSec, breakAnalysis.consistencyRatio, today]);

  // 4. Content Viewed Log with exact dates & times
  const contentLog = useMemo(() => {
    return getDetailedContentLog(dailyLog);
  }, [dailyLog]);

  // 5. Filtered Content Log
  const filteredContentLog = useMemo(() => {
    if (!searchQuery.trim()) return contentLog;
    const q = searchQuery.toLowerCase();
    return contentLog.filter(
      (item) =>
        item.lectureTitle?.toLowerCase().includes(q) ||
        item.formattedDate?.toLowerCase().includes(q) ||
        item.dateKey?.includes(q)
    );
  }, [contentLog, searchQuery]);

  if (!open) return null;

  return (
    <div className="cplm-overlay" role="presentation" onClick={onClose}>
      <div
        className="cplm-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Course Progress & Break Log"
      >
        {/* Header */}
        <div className="cplm-header">
          <div className="cplm-header__left">
            <div className="cplm-badge">
              <AuditIcon />
              <span>Course Progress &amp; Break Log</span>
            </div>
            <h2 className="cplm-title">{courseTitle || 'Course Activity'}</h2>
            <p className="cplm-subtitle">
              Live session tracking, break monitoring, and completion projections · All stored locally
            </p>
          </div>
          <button
            type="button"
            className="cplm-close"
            onClick={onClose}
            aria-label="Close progress log"
          >
            ✕
          </button>
        </div>

        {/* Dual Completion Projection Cards */}
        <div className="cplm-projections">
          {/* Fast-Track Card */}
          <div className="cplm-proj-card cplm-proj-card--fast">
            <div className="cplm-proj-card__head">
              <span className="cplm-proj-card__badge cplm-proj-card__badge--fast">⚡ Fast-Track Pace</span>
              <span className="cplm-proj-card__tag">Zero Breaks</span>
            </div>
            <div className="cplm-proj-card__date">{breakEta.fastTrackDateStr}</div>
            <div className="cplm-proj-card__desc">
              {breakEta.fastTrackDays > 0
                ? `${breakEta.fastTrackDays} study days needed at your current daily velocity`
                : 'Course completed! 🎉'}
            </div>
          </div>

          {/* Realistic Break-Adjusted Card */}
          <div className="cplm-proj-card cplm-proj-card--realistic">
            <div className="cplm-proj-card__head">
              <span className="cplm-proj-card__badge cplm-proj-card__badge--realistic">📅 Realistic Date</span>
              <span className="cplm-proj-card__tag">With Breaks</span>
            </div>
            <div className="cplm-proj-card__date">{breakEta.realisticDateStr}</div>
            <div className="cplm-proj-card__desc">
              {breakEta.realisticDays > 0
                ? `Factors in your ${breakAnalysis.consistencyPct}% historical consistency`
                : 'Course completed! 🎉'}
            </div>
          </div>
        </div>

        {/* Fast-Track Opportunity Banner */}
        {breakEta.daysSaved > 0 && (
          <div className="cplm-acceleration-banner">
            <RocketIcon />
            <div className="cplm-acceleration-banner__text">
              <strong>Finish {breakEta.daysSaved} days earlier:</strong> {breakEta.accelerationAdvice}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="cplm-tabs">
          <button
            type="button"
            className={`cplm-tab ${activeTab === 'overview' ? 'cplm-tab--active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Consistency &amp; Breaks
          </button>
          <button
            type="button"
            className={`cplm-tab ${activeTab === 'content' ? 'cplm-tab--active' : ''}`}
            onClick={() => setActiveTab('content')}
          >
            📋 Content Viewed Log ({contentLog.length})
          </button>
          <button
            type="button"
            className={`cplm-tab ${activeTab === 'breaks' ? 'cplm-tab--active' : ''}`}
            onClick={() => setActiveTab('breaks')}
          >
            ⏸️ Break Intervals ({breakAnalysis.breakIntervals.length})
          </button>
        </div>

        <div className="cplm-body">
          {/* TAB 1: OVERVIEW & BREAK METRICS */}
          {activeTab === 'overview' && (
            <div className="cplm-section">
              {/* Consistency Strip */}
              <div className="cplm-stats-grid">
                <div className="cplm-stat-box">
                  <span className="cplm-stat-box__icon">🎯</span>
                  <span className="cplm-stat-box__val">{breakAnalysis.consistencyPct}%</span>
                  <span className="cplm-stat-box__lbl">Study Consistency</span>
                </div>
                <div className="cplm-stat-box">
                  <span className="cplm-stat-box__icon">📖</span>
                  <span className="cplm-stat-box__val">{breakAnalysis.totalStudyDays}</span>
                  <span className="cplm-stat-box__lbl">Study Days</span>
                </div>
                <div className="cplm-stat-box">
                  <span className="cplm-stat-box__icon">⏸️</span>
                  <span className="cplm-stat-box__val">{breakAnalysis.totalBreakDays}</span>
                  <span className="cplm-stat-box__lbl">Break Days</span>
                </div>
                <div className="cplm-stat-box">
                  <span className="cplm-stat-box__icon">🗓️</span>
                  <span className="cplm-stat-box__val">{breakAnalysis.totalCalendarDays}</span>
                  <span className="cplm-stat-box__lbl">Total Days Elapsed</span>
                </div>
              </div>

              {/* Status and Longest Break */}
              <div className="cplm-break-summary-card">
                <div className="cplm-break-summary-card__row">
                  <div>
                    <span className="cplm-break-summary-card__label">Today's Status</span>
                    <div className="cplm-break-summary-card__val">
                      {breakAnalysis.isActiveToday ? (
                        <span className="cplm-status-pill cplm-status-pill--active">● Active Today</span>
                      ) : breakAnalysis.ongoingBreakDays > 0 ? (
                        <span className="cplm-status-pill cplm-status-pill--break">
                          ⏸️ On a {breakAnalysis.ongoingBreakDays}-day break
                        </span>
                      ) : (
                        <span className="cplm-status-pill">No session today yet</span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="cplm-break-summary-card__label">Average Break</span>
                    <div className="cplm-break-summary-card__val">
                      {breakAnalysis.avgBreakDays} days
                    </div>
                  </div>
                </div>

                <div className="cplm-progress-meter">
                  <div className="cplm-progress-meter__bar">
                    <div
                      className="cplm-progress-meter__fill"
                      style={{ width: `${breakAnalysis.consistencyPct}%` }}
                    />
                  </div>
                  <div className="cplm-progress-meter__legend">
                    <span>{breakAnalysis.totalStudyDays} active study days</span>
                    <span>{breakAnalysis.totalBreakDays} break days</span>
                  </div>
                </div>
              </div>

              {/* Study Speed & Pacing */}
              <div className="cplm-speed-card">
                <div className="cplm-speed-card__title">
                  <ClockIcon />
                  <span>Velocity &amp; Study Momentum</span>
                </div>
                <div className="cplm-speed-card__grid">
                  <div>
                    <span className="cplm-speed-card__lbl">Daily Velocity:</span>
                    <strong className="cplm-speed-card__val">{formatSecToHHMM(eta.velocitySec || dailyTargetSec)}/day</strong>
                  </div>
                  <div>
                    <span className="cplm-speed-card__lbl">Remaining Time:</span>
                    <strong className="cplm-speed-card__val">{formatSecToHHMM(stats?.remainingSec || 0)}</strong>
                  </div>
                  <div>
                    <span className="cplm-speed-card__lbl">Longest Break:</span>
                    <strong className="cplm-speed-card__val">{breakAnalysis.longestBreakDays} days</strong>
                  </div>
                  <div>
                    <span className="cplm-speed-card__lbl">Lectures Left:</span>
                    <strong className="cplm-speed-card__val">
                      {Math.max(0, (stats?.totalCount || 0) - (stats?.watchedCount || 0))}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONTENT VIEWED LOG (Exact timestamps) */}
          {activeTab === 'content' && (
            <div className="cplm-section">
              <div className="cplm-search-wrap">
                <input
                  type="text"
                  className="cplm-search-input"
                  placeholder="Search watched lectures..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="cplm-search-clear"
                    onClick={() => setSearchQuery('')}
                  >
                    ✕
                  </button>
                )}
              </div>

              {filteredContentLog.length === 0 ? (
                <div className="cplm-empty-state">
                  <span className="cplm-empty-state__icon">🔍</span>
                  <p>
                    {searchQuery
                      ? `No watched lectures match "${searchQuery}"`
                      : 'No watched lectures logged yet. Start studying to track content here!'}
                  </p>
                </div>
              ) : (
                <div className="cplm-log-list">
                  {filteredContentLog.map((item, idx) => (
                    <div key={`${item.lectureId}_${idx}`} className="cplm-log-item">
                      <div className="cplm-log-item__left">
                        <span className="cplm-log-item__dot" />
                        <div>
                          <div className="cplm-log-item__title">{item.lectureTitle}</div>
                          <div className="cplm-log-item__meta">
                            <span>{item.formattedDate}</span>
                            {item.formattedTime && (
                              <>
                                <span>·</span>
                                <span className="cplm-log-item__time">{item.formattedTime}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="cplm-log-item__right">
                        <span className="cplm-log-item__dur">{formatSecToHHMM(item.durationSec)}</span>
                        <span className="cplm-log-item__tag">Watched</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BREAK INTERVALS & INACTIVITY GAPS */}
          {activeTab === 'breaks' && (
            <div className="cplm-section">
              {breakAnalysis.breakIntervals.length === 0 ? (
                <div className="cplm-empty-state">
                  <span className="cplm-empty-state__icon">🔥</span>
                  <p>Zero breaks recorded! You have studied every single day since starting. Impressive!</p>
                </div>
              ) : (
                <div className="cplm-break-list">
                  {breakAnalysis.breakIntervals.map((b, idx) => (
                    <div
                      key={idx}
                      className={`cplm-break-item ${b.isOngoing ? 'cplm-break-item--ongoing' : ''}`}
                    >
                      <div className="cplm-break-item__left">
                        <span className="cplm-break-item__icon">{b.isOngoing ? '⏳' : '⏸️'}</span>
                        <div>
                          <div className="cplm-break-item__dates">
                            {b.startDate} {b.startDate !== b.endDate ? `to ${b.endDate}` : ''}
                          </div>
                          <div className="cplm-break-item__sub">
                            {b.isOngoing
                              ? `Current break in progress (${b.durationDays} day${b.durationDays !== 1 ? 's' : ''})`
                              : `Resumed study on ${b.resumedOn}`}
                          </div>
                        </div>
                      </div>
                      <div className="cplm-break-item__right">
                        <span className="cplm-break-item__days">
                          {b.durationDays} Day{b.durationDays !== 1 ? 's' : ''}
                        </span>
                        {b.isOngoing && <span className="cplm-break-item__ongoing-tag">ONGOING</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="cplm-footer">
          <span className="cplm-footer__note">
            🛡️ All course activity &amp; break tracking is strictly stored on your device.
          </span>
          <button type="button" className="cplm-footer__btn" onClick={onClose}>
            Close Log
          </button>
        </div>
      </div>
    </div>
  );
}

function AuditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
