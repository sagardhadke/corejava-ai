import { useMemo } from 'react';
import { dateKey, formatDuration, WEEKDAYS, MONTHS } from '../utils/time';
import Drawer from './Drawer';
import './CalendarPanel.css';

function buildWeeks(weeksBack = 17) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDow = today.getDay();
  const gridEnd = new Date(today);
  gridEnd.setDate(gridEnd.getDate() + (6 - endDow));

  const totalDays = weeksBack * 7;
  const gridStart = new Date(gridEnd);
  gridStart.setDate(gridStart.getDate() - totalDays + 1);

  const weeks = [];
  let cursor = new Date(gridStart);
  for (let w = 0; w < weeksBack; w++) {
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
  onOpenPracticeModalForDate,
}) {
  const weeks = useMemo(() => buildWeeks(17), []);
  const todayKey = dateKey();

  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = null;
    weeks.forEach((week, wi) => {
      const first = week[0];
      const m = first.getMonth();
      if (m !== lastMonth) {
        labels.push({ index: wi, label: MONTHS[m] });
        lastMonth = m;
      }
    });
    return labels;
  }, [weeks]);

  const totalActiveDays = useMemo(
    () => Object.values(history).filter((b) => b.watchedCount > 0 || b.isPractice).length,
    [history]
  );

  return (
    <Drawer open={open} onClose={onClose} title="Streak" side="right">
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
        Click any greyed-out past day with no activity to mark it as a practice day retroactively.
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
                const bucket = history[key];
                const isFuture = day > new Date();
                const isToday = key === todayKey;
                const isPractice = !!bucket?.isPractice;
                const isMissed = !isFuture && !isToday && !isPractice && !(bucket?.watchedCount > 0);
                const level = intensity(bucket?.watchedSec, targetSec);
                const cellClass = isFuture ? 'lvl-future' : isPractice ? 'lvl-practice' : `lvl-${level}`;
                let title = '';
                if (!isFuture) {
                  if (isPractice) {
                    title = `${day.toDateString()} · Practice day — ${bucket.practiceNote || ''}`;
                  } else if (isMissed) {
                    title = `${day.toDateString()} · No activity — click to mark as a practice day`;
                  } else {
                    title = `${day.toDateString()} · ${bucket ? formatDuration(bucket.watchedSec) + ' watched, ' + bucket.watchedCount + ' lecture(s)' : 'no activity'}`;
                  }
                }
                return (
                  <div
                    key={di}
                    className={`cal-cell ${cellClass}${isToday ? ' cal-cell--today' : ''}${isMissed ? ' cal-cell--clickable' : ''}`}
                    title={title}
                    onClick={isMissed ? () => onOpenPracticeModalForDate(day) : undefined}
                    role={isMissed ? 'button' : undefined}
                    tabIndex={isMissed ? 0 : undefined}
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
