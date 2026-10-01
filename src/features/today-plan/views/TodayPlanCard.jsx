import { formatDuration, spaceDurationLabel } from '../../../utils/time.js';
import './TodayPlanCard.css';

export default function TodayPlanCard({
  plannedLectures, watchedSet, targetSec, autoPlan, onToggleWatched, lectureNumbers,
  isTodayPracticeDay, hasWatchedToday, onOpenPracticeModal, onUnmarkPracticeDay,
  todayWatchedSec = 0, startDate,
}) {
  const plannedSec = plannedLectures.reduce((a, l) => a + l.durationSec, 0);
  const pct = targetSec > 0 ? Math.min(100, Math.round((todayWatchedSec / targetSec) * 100)) : 0;
  const isBeforeStart = !!(startDate && new Date().toISOString().slice(0, 10) < startDate);

  return (
    <div className="today-card" id="today-plan-card">
      <div className="today-card__head">
        <h3>Today's plan {autoPlan && <span className="auto-tag">AUTO</span>}</h3>
        <span className="today-card__total">{formatDuration(plannedSec)}</span>
      </div>

      <div className="today-card__watched-today">
        <span className="today-card__watched-today-label">Watched today</span>
        <span className="today-card__watched-today-val">{formatDuration(todayWatchedSec)}</span>
      </div>

      <div className="today-card__progress">
        <div className="progress-track"><div className="progress-track__fill" style={{ width: `${pct}%` }} /></div>
        <div className="today-card__progress-label">
          {formatDuration(todayWatchedSec)} / {formatDuration(targetSec)} target {pct > 0 ? `(${pct}%)` : ''}
        </div>
      </div>

      {plannedLectures.length === 0 ? (
        <div className="today-card__empty">
          Check the amber box next to any lecture to add it to today's plan.
        </div>
      ) : (
        <ul className="today-card__list">
          {plannedLectures.map((l) => {
            const done = watchedSet.has(l.id);
            return (
              <li key={l.id} className={done ? 'today-card__item--done' : ''}>
                <button className="today-card__check" onClick={() => onToggleWatched(l.id, l)} title={done ? 'Mark not watched' : 'Mark watched'}>
                  {done && <CheckIcon />}
                </button>
                <span className="today-card__item-number">{lectureNumbers.get(l.id)}</span>
                <span className="today-card__item-title">{l.title}</span>
                <span className="today-card__item-dur">{spaceDurationLabel(l.durationLabel)}</span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="today-card__practice">
        {isTodayPracticeDay ? (
          <div className="today-card__practice-active">
            <span>Marked as a practice day</span>
            <button onClick={onUnmarkPracticeDay}>Undo</button>
          </div>
        ) : (
          <button
            className="today-card__practice-btn"
            onClick={onOpenPracticeModal}
            disabled={hasWatchedToday || isBeforeStart}
            title={
              isBeforeStart
                ? `Cannot mark practice day before course start date (${startDate})`
                : hasWatchedToday
                ? "You've already watched a lecture today"
                : 'No lecture today? Log a practice day instead'
            }
          >
            No lecture today? Mark as practice day
          </button>
        )}
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
