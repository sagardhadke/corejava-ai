import { useState, useMemo, useEffect, useRef } from 'react';
import { dateKey, formatDuration, MONTHS } from '../../../utils/time.js';
import { getAggregatedHistory, formatActivityDate } from '../models/activityHistoryModel.js';
import Drawer from '../../../components/Drawer.jsx';
import { buildWeeksForYear, intensity } from '../models/calendarGridModel.js';
import { getStreakPromoEmailUrl, SUPPORT_EMAIL } from '../models/streakFreezeModel.js';
import './CalendarPanel.css';

const GITHUB_WEEKDAYS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

export default function CalendarPanel({
  open, onClose, history, streak, longestStreak, targetSec, streakMode,
  isTodayPracticeDay, hasWatchedToday, onOpenPracticeModal, onUnmarkPracticeDay,
  onOpenPracticeModalForDate, startDate, courses, course, onOpenBadges,
  availableFreezes = 2, usedFreezes = [], onRedeemCode,
}) {
  const currentYear = new Date().getFullYear();
  const courseStartYear = useMemo(() => {
    if (!startDate) return currentYear;
    const y = parseInt(startDate.slice(0, 4), 10);
    return isNaN(y) ? currentYear : Math.min(y, currentYear);
  }, [startDate, currentYear]);

  const availableYears = useMemo(() => {
    const yrs = [];
    for (let y = currentYear; y >= courseStartYear; y--) {
      yrs.push(y);
    }
    return yrs;
  }, [currentYear, courseStartYear]);

  const [selectedYearState, setSelectedYear] = useState(currentYear);
  const selectedYear = (selectedYearState < courseStartYear || selectedYearState > currentYear)
    ? currentYear
    : selectedYearState;

  const isCurrentYear = selectedYear === currentYear;
  const weeks = useMemo(() => buildWeeksForYear(selectedYear, isCurrentYear), [selectedYear, isCurrentYear]);

  const todayKey = dateKey();
  const [selectedDateKey, setSelectedDateKey] = useState(() => dateKey());
  const [showLearnMore, setShowLearnMore] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoFeedback, setPromoFeedback] = useState(null);
  const [showPromoHints, setShowPromoHints] = useState(false);
  const gridWrapRef = useRef(null);

  const handleRedeemPromo = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const trimmed = promoCode.trim();
    if (!trimmed) {
      setPromoFeedback({ type: 'error', message: 'Please enter a promo code.' });
      return;
    }
    if (typeof onRedeemCode === 'function') {
      const res = onRedeemCode(trimmed);
      if (res && res.success) {
        setPromoFeedback({ type: 'success', message: `+${res.addedShields} Streak Shields added! (${res.label})` });
        setPromoCode('');
      } else if (res && res.error) {
        setPromoFeedback({ type: 'error', message: res.error });
      }
    }
  };

  // Auto-scroll calendar grid to latest/current week on open or year change
  useEffect(() => {
    if (open && gridWrapRef.current) {
      requestAnimationFrame(() => {
        if (gridWrapRef.current) {
          gridWrapRef.current.scrollLeft = gridWrapRef.current.scrollWidth;
        }
      });
    }
  }, [open, selectedYear]);

  const aggregatedHistory = useMemo(
    () => getAggregatedHistory(courses, course, history),
    [courses, course, history]
  );

  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      const midDay = week[3];
      const m = midDay.getMonth();
      if (m !== lastMonth) {
        labels.push({ colIndex: wi, label: MONTHS[m] });
        lastMonth = m;
      }
    });
    return labels;
  }, [weeks]);

  const totalActiveDays = useMemo(
    () => Object.values(aggregatedHistory).filter((b) => b.watchedCount > 0 || b.isPractice || b.isStreakFreeze).length,
    [aggregatedHistory]
  );

  const selectedBucket = aggregatedHistory[selectedDateKey] || {
    watchedSec: 0,
    watchedCount: 0,
    entries: [],
    isPractice: false,
    practiceNote: '',
  };

  const selectedDateParts = selectedDateKey.split('-').map(Number);
  const selectedDateObj = new Date(selectedDateParts[0], selectedDateParts[1] - 1, selectedDateParts[2]);
  const isSelectedDateFuture = selectedDateObj > new Date();
  const isSelectedDateBeforeStart = !!(startDate && selectedDateKey < startDate);
  const isSelectedDateMissed = !isSelectedDateFuture && !isSelectedDateBeforeStart && selectedDateKey !== todayKey && !selectedBucket.isPractice && !(selectedBucket.watchedCount > 0) && !selectedBucket.isStreakFreeze;
  const isTodayBeforeStart = !!(startDate && todayKey < startDate);

  return (
    <Drawer open={open} onClose={onClose} title="Activity & Streak" side="right" className="cal-drawer">
      <div className="cal-summary">
        <div className="cal-stat cal-stat--current">
          <div className="cal-stat__icon">🔥</div>
          <div className="cal-stat__data">
            <div className="cal-stat__value cal-stat__value--fire">{streak}</div>
            <div className="cal-stat__label">Current Streak</div>
          </div>
        </div>
        <div className="cal-stat">
          <div className="cal-stat__icon">🏆</div>
          <div className="cal-stat__data">
            <div className="cal-stat__value">{longestStreak}</div>
            <div className="cal-stat__label">Longest Streak</div>
          </div>
        </div>
        <div className="cal-stat">
          <div className="cal-stat__icon">📅</div>
          <div className="cal-stat__data">
            <div className="cal-stat__value">{totalActiveDays}</div>
            <div className="cal-stat__label">Active Days</div>
          </div>
        </div>
        <div className="cal-stat cal-stat--shield" title={`${availableFreezes} auto-use shields available`}>
          <div className="cal-stat__icon">🛡️</div>
          <div className="cal-stat__data">
            <div className="cal-stat__value cal-stat__value--shield">{availableFreezes}</div>
            <div className="cal-stat__label">Streak Shields</div>
          </div>
        </div>
      </div>

      {/* Streak Shield & Promo Code Card */}
      <div className="cal-shield-card">
        <div className="cal-shield-card__header">
          <div className="cal-shield-card__title-row">
            <span className="cal-shield-card__icon" aria-hidden="true">🛡️</span>
            <div>
              <h4 className="cal-shield-card__title">Streak Shield Protection</h4>
              <p className="cal-shield-card__desc">
                Default 2 auto-use shields protect your streak if you miss a day or don't log in.
                {usedFreezes && usedFreezes.length > 0 ? ` (${usedFreezes.length} missed day${usedFreezes.length === 1 ? '' : 's'} saved by shield)` : ''}
              </p>
            </div>
          </div>
          <div className="cal-shield-card__badge" title={`${availableFreezes} streak shield(s) available`}>
            <span className="cal-shield-card__count">{availableFreezes}</span>
            <span className="cal-shield-card__badge-label">Available</span>
          </div>
        </div>

        {/* Promo code redemption form */}
        <form className="cal-shield-promo-form" onSubmit={handleRedeemPromo}>
          <div className="cal-shield-promo-input-wrap">
            <input
              type="text"
              className="cal-shield-promo-input"
              placeholder="Enter promo code (e.g. STREAKBOOST)"
              value={promoCode}
              onChange={(e) => {
                setPromoCode(e.target.value);
                setPromoFeedback(null);
              }}
              aria-label="Streak promo code"
            />
            <button
              type="submit"
              className="cal-shield-promo-btn"
              disabled={!promoCode.trim()}
            >
              Redeem
            </button>
          </div>
        </form>

        {promoFeedback && (
          <div className={`cal-shield-promo-msg cal-shield-promo-msg--${promoFeedback.type}`}>
            {promoFeedback.type === 'success' ? '✓ ' : '⚠️ '}
            {promoFeedback.message}
          </div>
        )}

        {/* Request promo code via email & hints */}
        <div className="cal-shield-actions">
          <a
            href={getStreakPromoEmailUrl(course?.title)}
            className="cal-shield-email-link"
            target="_blank"
            rel="noopener noreferrer"
            title="Send an email to request a streak shield promo code"
          >
            <EnvelopeIcon /> Request Code via Email
          </a>
          <span className="cal-shield-sep">·</span>
          <button
            type="button"
            className="cal-shield-hint-btn"
            onClick={() => setShowPromoHints((v) => !v)}
          >
            {showPromoHints ? 'Hide bonus codes' : 'View bonus codes'}
          </button>
        </div>

        {showPromoHints && (
          <div className="cal-shield-hints-box">
            <span className="cal-shield-hints-title">Available bonus promo codes:</span>
            <div className="cal-shield-codes-list">
              {['STREAKBOOST', 'SAVEMYSTREAK', 'JAVAHERO', 'INVESTOR10B'].map((code) => (
                <button
                  type="button"
                  key={code}
                  className="cal-shield-code-chip"
                  onClick={() => {
                    setPromoCode(code);
                    setPromoFeedback(null);
                  }}
                  title={`Click to fill ${code}`}
                >
                  {code}
                </button>
              ))}
            </div>
            <p className="cal-shield-hints-sub">
              Or email <code>{SUPPORT_EMAIL}</code> to receive a personalized shield code.
            </p>
          </div>
        )}
      </div>

      {onOpenBadges && (
        <button
          type="button"
          className="cal-badges-banner"
          onClick={() => {
            onClose();
            onOpenBadges();
          }}
          title="View Badges & Achievements"
        >
          <div className="cal-badges-banner__left">
            <span className="cal-badges-banner__icon">🏆</span>
            <div className="cal-badges-banner__text">
              <span className="cal-badges-banner__title">Achievements & Badges</span>
              <span className="cal-badges-banner__sub">View course completion & streak milestone badges</span>
            </div>
          </div>
          <span className="cal-badges-banner__arrow">View Badges →</span>
        </button>
      )}

      <div className="practice-cta">
        {isTodayPracticeDay ? (
          <div className="practice-cta__active">
            <span><PencilIcon /> Today is marked as a practice day</span>
            <button className="practice-cta__undo" onClick={onUnmarkPracticeDay}>Undo</button>
          </div>
        ) : (
          <button
            className="practice-cta__btn"
            onClick={onOpenPracticeModal}
            disabled={hasWatchedToday || isTodayBeforeStart}
            title={
              isTodayBeforeStart
                ? `Cannot mark practice day before course start date (${startDate})`
                : hasWatchedToday
                ? "You've already watched a lecture today"
                : 'No lecture today? Log it as a practice day instead'
            }
          >
            <PencilIcon /> Mark today as a practice day
          </button>
        )}
        {hasWatchedToday && !isTodayPracticeDay && (
          <p className="practice-cta__hint">You've already watched a lecture today — no need for a practice day.</p>
        )}
        {isTodayBeforeStart && (
          <p className="practice-cta__hint">Course start date is in the future ({startDate}).</p>
        )}
      </div>

      {/* GitHub Contribution Calendar Grid */}
      <div className="cal-card">
        <div className="cal-grid-wrap" ref={gridWrapRef}>
          <div className="cal-months-track">
            {monthLabels.map((m) => (
              <span
                key={`${m.colIndex}-${m.label}`}
                className="cal-month-label"
                style={{ left: `${26 + m.colIndex * 14}px` }}
              >
                {m.label}
              </span>
            ))}
          </div>
          <div className="cal-grid">
            <div className="cal-dow-col" aria-hidden="true">
              {GITHUB_WEEKDAYS.map((d, i) => (
                <span key={i} className="cal-dow">{d}</span>
              ))}
            </div>
            {weeks.map((week, wi) => (
              <div className="cal-week" key={wi}>
                {week.map((day, di) => {
                  const key = dateKey(day);
                  const bucket = aggregatedHistory[key];
                  const isFuture = day > new Date();
                  const isToday = key === todayKey;
                  const isSelected = key === selectedDateKey;
                  const isPractice = !!bucket?.isPractice;
                  const isShield = !!(bucket?.isStreakFreeze || bucket?.isTrialStreak);
                  const isBeforeStart = !!(startDate && key < startDate);
                  const isMissed = !isFuture && !isToday && !isPractice && !isShield && !(bucket?.watchedCount > 0);
                  const level = intensity(bucket?.watchedSec, targetSec);
                  const cellClass = isFuture
                    ? 'lvl-future'
                    : isBeforeStart
                    ? 'lvl-0'
                    : isShield
                    ? 'lvl-shield'
                    : isPractice
                    ? 'lvl-practice'
                    : `lvl-${level}`;

                  let title = '';
                  if (!isFuture) {
                    if (isBeforeStart) {
                      title = `${day.toDateString()} · Prior to course start date (${startDate})`;
                    } else if (isShield) {
                      title = `${day.toDateString()} · 🛡️ Streak Shield — ${bucket.freezeNote || 'Auto-protected missed day'} (Click to inspect)`;
                    } else if (isPractice) {
                      title = `${day.toDateString()} · Practice day — ${bucket.practiceNote || ''} (Click to inspect)`;
                    } else if (isMissed) {
                      title = `${day.toDateString()} · No activity (Click to inspect)`;
                    } else {
                      title = `${day.toDateString()} · ${bucket ? formatDuration(bucket.watchedSec) + ' watched, ' + bucket.watchedCount + ' lecture(s)' : 'no activity'} (Click to inspect)`;
                    }
                  } else {
                    title = `${day.toDateString()} · Upcoming schedule (Click to inspect)`;
                  }

                  return (
                    <div
                      key={di}
                      className={`cal-cell ${cellClass}${isToday ? ' cal-cell--today' : ''}${isSelected ? ' cal-cell--selected' : ''} cal-cell--clickable`}
                      title={title}
                      onClick={() => setSelectedDateKey(key)}
                      role="button"
                      tabIndex={0}
                      aria-label={`${key}: ${isFuture ? 'upcoming date' : isShield ? 'streak shield applied' : bucket ? bucket.watchedCount + ' lectures watched' : 'no activity'}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Calendar Footer: Learn how we count + Legend */}
        <div className="cal-footer">
          <button
            className="cal-learn-btn"
            onClick={() => setShowLearnMore((v) => !v)}
            type="button"
          >
            Learn how we count contributions
          </button>
          <div className="cal-legend">
            <span className="cal-legend__label">Less</span>
            <div className="cal-cell lvl-0" title="No activity" />
            <div className="cal-cell lvl-1" title="Low activity" />
            <div className="cal-cell lvl-2" title="Medium activity" />
            <div className="cal-cell lvl-3" title="High activity" />
            <div className="cal-cell lvl-4" title="Target met" />
            <span className="cal-legend__label">More</span>
            <span className="cal-legend__sep">·</span>
            <div className="cal-cell lvl-shield" title="🛡️ Streak Shield auto-applied" />
            <span className="cal-legend__label">Shield</span>
            <span className="cal-legend__sep">·</span>
            <div className="cal-cell lvl-practice" title="Practice day" />
            <span className="cal-legend__label">Practice</span>
            <span className="cal-legend__sep">·</span>
            <div className="cal-cell lvl-future" title="Upcoming month ahead" />
            <span className="cal-legend__label">Upcoming</span>
          </div>
        </div>

        {showLearnMore && (
          <div className="cal-learn-box">
            <p>
              Activity is counted when {streakMode === 'target' ? 'you hit your daily target' : 'you mark at least 1 lecture watched'}.
              Days marked as Practice count toward streaks as well. You can change the streak calculation mode in Settings.
            </p>
          </div>
        )}
      </div>

      {/* GitHub-Style Contribution Activity Section with Year Selector */}
      <div className="cal-section-bar">
        <h3 className="cal-section-title">Contribution activity</h3>
        {availableYears.length > 0 && (
          <div className="cal-year-selector">
            <label htmlFor="cal-year-select" className="cal-year-label">Year:</label>
            <select
              id="cal-year-select"
              className="cal-year-select"
              value={selectedYear}
              onChange={(e) => {
                const yr = Number(e.target.value);
                setSelectedYear(yr);
                if (yr === currentYear) {
                  setSelectedDateKey(todayKey);
                } else {
                  setSelectedDateKey(`${yr}-12-31`);
                }
              }}
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Activity Details for Selected Date */}
      <div className="cal-activity">
        <div className="cal-activity__head">
          <div className="cal-activity__title-group">
            <h4>{formatActivityDate(selectedDateKey)}</h4>
            {selectedDateKey === todayKey && <span className="cal-activity__today-tag">TODAY</span>}
          </div>
          <div className="cal-activity__meta-badge">
            <span>{selectedBucket.watchedCount || 0} lecture{selectedBucket.watchedCount === 1 ? '' : 's'}</span>
            <span className="cal-activity__dot">·</span>
            <strong>{formatDuration(selectedBucket.watchedSec || 0)} watched</strong>
          </div>
        </div>

        {selectedBucket.entries && selectedBucket.entries.length > 0 ? (
          <div className="cal-activity__list">
            {selectedBucket.entries.map((item, idx) => (
              <div key={item.lectureId || idx} className="cal-activity__row">
                {item.courseTitle && (
                  <div className="cal-activity__course-tag" title={item.courseTitle}>
                    <span className="cal-activity__course-title">{item.courseTitle}</span>
                  </div>
                )}
                <div className="cal-activity__main-row">
                  <div className="cal-activity__left">
                    <span className="cal-activity__check"><CheckIcon /></span>
                    <span className="cal-activity__lecture-line">
                      {item.lectureNumber && (
                        <span className="cal-activity__lecture-num">{item.lectureNumber}</span>
                      )}
                      <span className="cal-activity__lecture-name">{item.lectureTitle}</span>
                    </span>
                  </div>
                  <div className="cal-activity__right">
                    <span className="cal-activity__lecture-time">
                      {item.durationLabel || formatDuration(item.durationSec)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (selectedBucket.isStreakFreeze || selectedBucket.isTrialStreak) ? (
          <div className="cal-activity__freeze-card">
            <div className="cal-activity__freeze-header">
              <span className="cal-activity__freeze-icon">🛡️</span>
              <div>
                <span className="cal-activity__freeze-badge">STREAK SHIELD ACTIVE</span>
                <p className="cal-activity__freeze-note">
                  {selectedBucket.freezeNote || 'This missed day was automatically preserved by your Streak Shield.'}
                </p>
              </div>
            </div>
          </div>
        ) : selectedBucket.isPractice ? (
          <div className="cal-activity__practice-card">
            <span className="cal-activity__practice-badge">PRACTICE DAY</span>
            <p className="cal-activity__practice-note">
              {selectedBucket.practiceNote || 'No notes entered for this practice day.'}
            </p>
          </div>
        ) : isSelectedDateFuture ? (
          <div className="cal-activity__empty">
            <span className="cal-activity__future-badge">Upcoming Date</span>
            <p className="cal-activity__empty-text">
              This date is in the upcoming month. Lectures you watch or practice days you log will appear here once you reach this date.
            </p>
          </div>
        ) : isSelectedDateBeforeStart ? (
          <div className="cal-activity__empty">
            <span className="cal-activity__before-start-badge">Before Course Start Date</span>
            <p className="cal-activity__empty-text">
              This date is before the course started ({startDate}). Practice activities cannot be recorded before the course start date.
            </p>
          </div>
        ) : (
          <div className="cal-activity__empty">
            <div className="cal-activity__empty-icon">☕</div>
            <p className="cal-activity__empty-text">No lecture activity recorded for this day.</p>
            {isSelectedDateMissed ? (
              <button
                className="cal-activity__add-practice-btn"
                onClick={() => onOpenPracticeModalForDate(selectedDateObj)}
              >
                <PencilIcon /> Mark as practice day retroactively
              </button>
            ) : selectedDateKey === todayKey ? (
              <p className="cal-activity__empty-hint">Complete a lecture from today's plan to build your streak!</p>
            ) : null}
          </div>
        )}
      </div>
    </Drawer>
  );
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EnvelopeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
