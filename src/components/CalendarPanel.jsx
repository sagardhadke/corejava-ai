import { useState, useMemo } from 'react';
import { dateKey, formatDuration, WEEKDAYS, MONTHS } from '../utils/time';
import { getAggregatedHistory, formatActivityDate } from '../utils/activityHistory';
import Drawer from './Drawer';
import './CalendarPanel.css';

function buildWeeks(startDateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let start = new Date(today);
  if (startDateStr) {
    const parts = startDateStr.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0])) {
      start = new Date(parts[0], parts[1] - 1, parts[2]);
      start.setHours(0, 0, 0, 0);
    }
  }

  const effectiveEnd = today >= start ? today : start;
  const endDow = effectiveEnd.getDay();
  const gridEnd = new Date(effectiveEnd);
  gridEnd.setDate(gridEnd.getDate() + (6 - endDow));

  const startDow = start.getDay();
  const gridStart = new Date(start);
  gridStart.setDate(gridStart.getDate() - startDow);

  const weeks = [];
  const cursor = new Date(gridStart);
  let safety = 0;
  while (cursor <= gridEnd && safety < 1000) {
    safety++;
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function intensity(sec, targetSec) {
  if (!sec) return 0;
  const ratio = sec / targetSec;
  if (ratio >= 1) return 4;
  if (ratio >= 0.66) return 3;
  if (ratio >= 0.33) return 2;
  return 1;
}

export default function CalendarPanel({
  open, onClose, history, streak, longestStreak, targetSec, streakMode,
  isTodayPracticeDay, hasWatchedToday, onOpenPracticeModal, onUnmarkPracticeDay,
  onOpenPracticeModalForDate, startDate, courses, course,
}) {
  const weeks = useMemo(() => buildWeeks(startDate), [startDate]);
  const todayKey = dateKey();
  const [selectedDateKey, setSelectedDateKey] = useState(() => dateKey());

  const aggregatedHistory = useMemo(
    () => getAggregatedHistory(courses, course, history),
    [courses, course, history]
  );

  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = null;
    weeks.forEach((week, wi) => {
      const firstValid = week.find((d) => !startDate || dateKey(d) >= startDate);
      if (!firstValid) return;
      const m = firstValid.getMonth();
      if (m !== lastMonth) {
        labels.push({ index: wi, label: MONTHS[m] });
        lastMonth = m;
      }
    });
    return labels;
  }, [weeks, startDate]);

  const totalActiveDays = useMemo(
    () => Object.values(aggregatedHistory).filter((b) => b.watchedCount > 0 || b.isPractice).length,
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
  const isSelectedDateMissed = !isSelectedDateFuture && selectedDateKey !== todayKey && !selectedBucket.isPractice && !(selectedBucket.watchedCount > 0);

  return (
    <Drawer open={open} onClose={onClose} title="Activity & Streak" side="right" className="drawer--wide">
      <div className="cal-summary">
        <div className="cal-stat">
          <div className="cal-stat__value cal-stat__value--fire">{streak}</div>
          <div className="cal-stat__label">current streak</div>
        </div>
        <div className="cal-stat">
          <div className="cal-stat__value">{longestStreak}</div>
          <div className="cal-stat__label">longest streak</div>
        </div>
        <div className="cal-stat">
          <div className="cal-stat__value">{totalActiveDays}</div>
          <div className="cal-stat__label">active days</div>
        </div>
      </div>

      <p className="cal-mode-note">
        Counting a day as active when {streakMode === 'target' ? 'you hit your daily target' : 'you mark at least 1 lecture watched'} — change this in Settings.
        Click any date in the calendar below to inspect course and lecture activity for that day.
      </p>

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
            disabled={hasWatchedToday}
            title={hasWatchedToday ? "You've already watched a lecture today" : 'No lecture today? Log it as a practice day instead'}
          >
            <PencilIcon /> Mark today as a practice day
          </button>
        )}
        {hasWatchedToday && !isTodayPracticeDay && (
          <p className="practice-cta__hint">You've already watched a lecture today — no need for a practice day.</p>
        )}
      </div>

      <div className="cal-grid-wrap">
        <div className="cal-months">
          {monthLabels.map((m) => (
            <span key={m.index} style={{ gridColumnStart: m.index + 2 }}>{m.label}</span>
          ))}
        </div>
        <div className="cal-grid">
          <div className="cal-dow-col">
            {WEEKDAYS.map((d, i) => (
              <span key={d} className="cal-dow">{i % 2 === 1 ? d.slice(0, 1) : ''}</span>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div className="cal-week" key={wi}>
              {week.map((day, di) => {
                const key = dateKey(day);
                if (startDate && key < startDate) {
                  return <div key={di} className="cal-cell cal-cell--hidden" aria-hidden="true" />;
                }
                const bucket = aggregatedHistory[key];
                const isFuture = day > new Date();
                const isToday = key === todayKey;
                const isSelected = key === selectedDateKey;
                const isPractice = !!bucket?.isPractice;
                const isMissed = !isFuture && !isToday && !isPractice && !(bucket?.watchedCount > 0);
                const level = intensity(bucket?.watchedSec, targetSec);
                const cellClass = isFuture ? 'lvl-future' : isPractice ? 'lvl-practice' : `lvl-${level}`;
                let title = '';
                if (!isFuture) {
                  if (isPractice) {
                    title = `${day.toDateString()} · Practice day — ${bucket.practiceNote || ''} (Click to inspect)`;
                  } else if (isMissed) {
                    title = `${day.toDateString()} · No activity (Click to inspect)`;
                  } else {
                    title = `${day.toDateString()} · ${bucket ? formatDuration(bucket.watchedSec) + ' watched, ' + bucket.watchedCount + ' lecture(s)' : 'no activity'} (Click to inspect)`;
                  }
                }
                return (
                  <div
                    key={di}
                    className={`cal-cell ${cellClass}${isToday ? ' cal-cell--today' : ''}${isSelected ? ' cal-cell--selected' : ''}${!isFuture ? ' cal-cell--clickable' : ''}`}
                    title={title}
                    onClick={!isFuture ? () => setSelectedDateKey(key) : undefined}
                    role={!isFuture ? 'button' : undefined}
                    tabIndex={!isFuture ? 0 : undefined}
                    aria-label={`${key}: ${bucket ? bucket.watchedCount + ' lectures watched' : 'no activity'}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="cal-legend">
        <span>Less</span>
        <div className="cal-cell lvl-0" />
        <div className="cal-cell lvl-1" />
        <div className="cal-cell lvl-2" />
        <div className="cal-cell lvl-3" />
        <div className="cal-cell lvl-4" />
        <span>More</span>
        <span className="cal-legend__practice"><span className="cal-cell lvl-practice" /> Practice day</span>
      </div>

      {/* Activity Details for Selected Date (GitHub Style) */}
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
                <div className="cal-activity__row-icon">
                  <CheckIcon />
                </div>
                <div className="cal-activity__row-content">
                  <div className="cal-activity__row-header">
                    <span className="cal-activity__course-pill">{item.courseTitle}</span>
                    {item.lectureNumber && (
                      <span className="cal-activity__lecture-num">#{item.lectureNumber}</span>
                    )}
                  </div>
                  <span className="cal-activity__lecture-title">{item.lectureTitle}</span>
                </div>
                <span className="cal-activity__lecture-dur">
                  {item.durationLabel || formatDuration(item.durationSec)}
                </span>
              </div>
            ))}
          </div>
        ) : selectedBucket.isPractice ? (
          <div className="cal-activity__practice-card">
            <span className="cal-activity__practice-badge">PRACTICE DAY</span>
            <p className="cal-activity__practice-note">
              {selectedBucket.practiceNote || 'No notes entered for this practice day.'}
            </p>
          </div>
        ) : (
          <div className="cal-activity__empty">
            <p className="cal-activity__empty-text">No lecture activity recorded on this day.</p>
            {isSelectedDateMissed && (
              <button
                className="cal-activity__add-practice-btn"
                onClick={() => onOpenPracticeModalForDate(selectedDateObj)}
              >
                <PencilIcon /> Mark as practice day retroactively
              </button>
            )}
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
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
