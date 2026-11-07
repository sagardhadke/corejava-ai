import { spaceDurationLabel } from '../../../utils/time.js';
import './LectureRow.css';

export default function LectureRow({ lecture, number, watched, inPlan, onToggleWatched, onTogglePlan, isDailyLimitReached, todayRemainingCapSec, onOpenAiTutor }) {
  const lectureSec = lecture?.durationSec || 0;
  const wouldExceedRemainingCap = typeof todayRemainingCapSec === 'number' && todayRemainingCapSec < lectureSec && lectureSec > 0;
  const isLocked = !watched && (isDailyLimitReached || wouldExceedRemainingCap);

  const lockTooltip = isDailyLimitReached
    ? 'Daily 5-hour limit reached — locked for today (click for details & exercises)'
    : isLocked
    ? `Locked: ${spaceDurationLabel(lecture.durationLabel)} lecture exceeds remaining 5h daily cap (${Math.round(todayRemainingCapSec / 60)}m left today)`
    : 'Mark as watched';

  return (
    <div className={`lecture-row ${watched ? 'lecture-row--watched' : ''} ${inPlan && !watched ? 'lecture-row--today' : ''} ${isLocked ? 'lecture-row--locked' : ''}`}>
      <span className="lecture-row__number" title={`Lecture ${number} of the course`}>{number}</span>

      {/* Plan checkbox: hidden once watched OR if lecture is locked for today */}
      {!watched && !isLocked && (
        <label className="plan-check" title="Add to today's plan" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={inPlan}
            onChange={() => onTogglePlan(lecture.id)}
            aria-label={`Add lecture ${number || ''} to today's plan`}
          />
          <span className="plan-check__box">
            {inPlan && <CheckIcon />}
          </span>
        </label>
      )}

      <button
        className={`watched-toggle ${isLocked ? 'watched-toggle--locked' : ''}`}
        onClick={() => onToggleWatched(lecture.id, lecture)}
        title={watched ? 'Mark as not watched' : lockTooltip}
        aria-label={watched ? `Mark lecture ${number || ''} as not watched` : isLocked ? `Lecture ${number || ''} locked — daily 5-hour limit reached` : `Mark lecture ${number || ''} as watched`}
        aria-pressed={watched}
      >
        <span className={`watched-toggle__ring ${watched ? 'watched-toggle__ring--on' : ''} ${isLocked ? 'watched-toggle__ring--locked' : ''}`}>
          {watched && <CheckIcon small />}
          {isLocked && <LockIconSmall />}
        </span>
      </button>

      <span className="lecture-row__title">{lecture.title}</span>

      {watched && <span className="completed-pill">COMPLETED</span>}
      {inPlan && !watched && <span className="today-pill">TODAY</span>}
      {isLocked && (
        <span
          className="locked-pill"
          title={isDailyLimitReached ? '5h daily limit reached — content locked until tomorrow' : `Exceeds remaining daily limit (${Math.round(todayRemainingCapSec / 60)}m left today)`}
        >
          <LockIconSmall /> LOCKED
        </span>
      )}

      <span className="lecture-row__dur">{spaceDurationLabel(lecture.durationLabel)}</span>

      {onOpenAiTutor && (
        <button
          type="button"
          className="lecture-row__ai-btn"
          onClick={(e) => {
            e.stopPropagation();
            onOpenAiTutor({ scopeType: 'topic', lectureId: lecture.id, sectionId: lecture.sectionId });
          }}
          title={`Ask AI Tutor about: ${lecture.title}`}
          aria-label={`Ask AI Tutor about lecture: ${lecture.title}`}
        >
          <SparkleIconSmall />
        </button>
      )}
    </div>
  );
}

function SparkleIconSmall() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2L14.4 8.6L21 11L14.4 13.4L12 20L9.6 13.4L3 11L9.6 8.6L12 2Z" />
    </svg>
  );
}

function LockIconSmall() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2.2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
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
