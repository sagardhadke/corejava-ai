import { useState } from 'react';
import { formatDuration } from '../../../utils/time.js';
import './PerSectionProgress.css';

export default function PerSectionProgress({ sectionProgress = [], onJumpToSection, visibleCount = 7 }) {
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const configuredCount = Math.max(5, Math.min(10, Number(visibleCount) || 7));
  const totalSections = sectionProgress.length;
  // Automatically adjust visible count if course has fewer sections than the configured limit
  const count = totalSections > 0 ? Math.min(configuredCount, totalSections) : configuredCount;

  return (
    <div className="psp-card" style={{ '--psp-visible-items': count }}>
      <div className="psp-card__head" onClick={() => setMobileExpanded((v) => !v)}>
        <h3>Per-section progress</h3>
        <div className="psp-card__head-actions">
          <span className="psp-card__summary">
            {sectionProgress.filter((s) => s.isComplete).length}/{totalSections} done
          </span>
          <span className="psp-mobile-toggle" aria-hidden="true">
            {mobileExpanded ? 'Hide ▲' : 'View ▼'}
          </span>
        </div>
      </div>
      {totalSections === 0 ? (
        <div className="psp-empty">No sections available for this course.</div>
      ) : (
        <ul className={`psp-list ${!mobileExpanded ? 'psp-list--mobile-collapsed' : ''}`}>
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
      )}
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
