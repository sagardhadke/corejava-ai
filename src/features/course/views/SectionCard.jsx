import { formatDuration } from '../../../utils/time.js';
import LectureRow from './LectureRow.jsx';
import './SectionCard.css';

export default function SectionCard({ section, isOpen, onToggleOpen, watchedSet, planSet, onToggleWatched, onTogglePlan, lectureNumbers }) {
  const total = section.lectures?.length || 0;
  const doneCount = (section.lectures || []).filter((l) => watchedSet.has(l.id)).length;
  const totalSec = (section.lectures || []).reduce((a, l) => a + (l.durationSec || 0), 0);
  const doneSec = (section.lectures || []).filter((l) => watchedSet.has(l.id)).reduce((a, l) => a + (l.durationSec || 0), 0);
  const remSec = totalSec - doneSec;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const hasToday = (section.lectures || []).some((l) => planSet.has(l.id));
  const isComplete = total > 0 && doneCount === total;

  return (
    <div className={`section-card ${isOpen ? 'section-card--open' : ''} ${isComplete ? 'section-card--complete' : ''}`}>
      <button className="section-card__head" onClick={onToggleOpen}>
        <span className="section-card__chevron"><ChevronIcon /></span>
        <span className="section-card__number">{section.number}</span>
        <span className="section-card__title">
          {section.title}
          {section.isProject && <span className="project-pill">PROJECT</span>}
          {hasToday && <span className="today-dot" title="Has lectures in today's plan" />}
        </span>
        <span className="section-card__mini-bar"><span style={{ width: `${pct}%` }} /></span>
        <span className="section-card__meta">
          {doneCount}/{total} · {formatDuration(totalSec)}
          {remSec > 0 && <span className="meta-left"> · {formatDuration(remSec)} left</span>}
        </span>
      </button>
      {isOpen && (
        <div className="section-card__body">
          {section.lectures?.map((l) => (
            <LectureRow
              key={l.id}
              lecture={l}
              number={lectureNumbers?.get(l.id)}
              watched={watchedSet.has(l.id)}
              inPlan={planSet.has(l.id)}
              onToggleWatched={onToggleWatched}
              onTogglePlan={onTogglePlan}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
