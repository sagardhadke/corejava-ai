import { useEffect, useState } from 'react';
import { formatClock } from '../utils/time';
import CourseSelector from './CourseSelector';
import './Header.css';

export default function Header({ streak, onOpenCalendar, onOpenSettings, pct, courses, activeCourseId, onSwitchCourse }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div className="brand">
          <div className="brand__mark" aria-hidden="true"><span>{'{ }'}</span></div>
          <div className="brand__text">
            {courses.length > 1 ? (
              <CourseSelector
                courses={courses}
                activeCourseId={activeCourseId}
                onSwitch={onSwitchCourse}
                variant="header"
              />
            ) : (
              <h1>{courses[0]?.title || 'Course Tracker'}</h1>
            )}
            <p className="brand__sub">Lecture Tracker</p>
          </div>
        </div>

        <div className="header-mid">
          <div className="clock" title="Local time">{formatClock(now)}</div>
          <div className="mini-progress" title={`${pct}% of course complete`}>
            <div className="mini-progress__bar"><div style={{ width: `${pct}%` }} /></div>
            <span className="mini-progress__label">{pct}%</span>
          </div>
        </div>

        <div className="header-actions">
          <button className="icon-btn streak-btn" onClick={onOpenCalendar} title="Streak calendar">
            <FireIcon />
            <span className="streak-count">{streak}</span>
          </button>
          <button className="icon-btn" onClick={onOpenSettings} title="Settings">
            <GearIcon />
          </button>
        </div>
      </div>
    </header>
  );
}

function FireIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2c1 3-2 4-2 7a2 2 0 0 0 4 0c2 1 3 3 3 5.5A5.5 5.5 0 0 1 6 14.5c0-3 1.5-4.5 3-7 .5 1 1 1.5 1 1.5C10.5 6 11 4 12 2z"
        stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2.05 2.05 0 1 1-2.9 2.9l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56v.16a2.05 2.05 0 0 1-4.1 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2.05 2.05 0 1 1-2.9-2.9l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03h-.16a2.05 2.05 0 0 1 0-4.1h.09a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2.05 2.05 0 1 1 2.9-2.9l.06.06a1.7 1.7 0 0 0 1.87.34h.08a1.7 1.7 0 0 0 1.03-1.56v-.16a2.05 2.05 0 0 1 4.1 0v.09a1.7 1.7 0 0 0 1.03 1.56h.08a1.7 1.7 0 0 0 1.87-.34l.06-.06a2.05 2.05 0 1 1 2.9 2.9l-.06.06a1.7 1.7 0 0 0-.34 1.87v.08a1.7 1.7 0 0 0 1.56 1.03h.16a2.05 2.05 0 0 1 0 4.1h-.09a1.7 1.7 0 0 0-1.56 1.03z"
        stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}
