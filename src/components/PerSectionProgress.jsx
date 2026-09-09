import { formatDuration } from '../utils/time';
import './PerSectionProgress.css';

export default function PerSectionProgress({ sectionProgress, onJumpToSection }) {
  return (
    <div className="psp-card">
      <div className="psp-card__head">
        <h3>Per-section progress</h3>
        <span className="psp-card__summary">
          {sectionProgress.filter((s) => s.isComplete).length}/{sectionProgress.length} done
        </span>
      </div>
      <ul className="psp-list">
        {sectionProgress.map((s) => {
          const pct = s.total ? Math.round((s.watchedCount / s.total) * 100) : 0;
          return (
            <li
              key={s.sectionId}
              className={`psp-item ${s.isComplete ? 'psp-item--complete' : ''}`}
              onClick={() => onJumpToSection && onJumpToSection(s.sectionId)}
            >
              <div className="psp-item__top">
                <div className="psp-item__left">
                  <span className="psp-item__number">{s.number}</span>
                  <span className="psp-item__title">{s.title}</span>
                </div>
                <div className="psp-item__right">
                  {s.isComplete ? (
                    <span className="psp-item__done-tag"><DoneCheckIcon /> Done</span>
                  ) : (
                    <span className="psp-item__pct">{pct}%</span>
                  )}
                </div>
              </div>
              <div className="psp-item__bar-wrap">
                <div className="psp-item__bar">
                  <div
                    className={`psp-item__bar-fill ${s.isComplete ? 'psp-item__bar-fill--done' : ''}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <div className="psp-item__bottom">
                <span className="psp-item__count">{s.watchedCount}/{s.total} lectures</span>
                <span className="psp-item__remaining">
                  {s.isComplete ? 'all watched' : `${formatDuration(s.remainingSec)} left`}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DoneCheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
