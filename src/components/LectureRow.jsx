import './LectureRow.css';
import { spaceDurationLabel } from '../utils/time';

export default function LectureRow({ lecture, number, watched, inPlan, onToggleWatched, onTogglePlan }) {
  return (
    <div className={`lecture-row ${watched ? 'lecture-row--watched' : ''} ${inPlan && !watched ? 'lecture-row--today' : ''}`}>
      <span className="lecture-row__number" title={`Lecture ${number} of the course`}>{number}</span>

      {/* Once a lecture is marked watched, there's nothing left to "plan" for it —
          hide the today's-plan checkbox entirely with no spacer, since the watched
          state has its own visual treatment (completed badge) that fills the space. */}
      {!watched && (
        <label className="plan-check" title="Add to today's plan" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={inPlan}
            onChange={() => onTogglePlan(lecture.id)}
          />
          <span className="plan-check__box">
            {inPlan && <CheckIcon />}
          </span>
        </label>
      )}

      <button
        className="watched-toggle"
        onClick={() => onToggleWatched(lecture.id, lecture)}
        title={watched ? 'Mark as not watched' : 'Mark as watched'}
      >
        <span className={`watched-toggle__ring ${watched ? 'watched-toggle__ring--on' : ''}`}>
          {watched && <CheckIcon small />}
        </span>
      </button>

      <span className="lecture-row__title">{lecture.title}</span>

      {watched && <span className="completed-pill">COMPLETED</span>}
      {inPlan && !watched && <span className="today-pill">TODAY</span>}

      <span className="lecture-row__dur">{spaceDurationLabel(lecture.durationLabel)}</span>
    </div>
  );
}

function CheckIcon({ small }) {
  const s = small ? 11 : 12;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
