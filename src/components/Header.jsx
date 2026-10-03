import { useEffect, useState } from 'react';
import { formatClock } from '../utils/time';
import CourseSelector from './CourseSelector';
import './Header.css';

export default function Header({
  streak,
  onOpenCalendar,
  onOpenSettings,
  pct,
  courses,
  activeCourseId,
  onSwitchCourse,
  unlockedBadgesCount = 0,
  onOpenBadges,
  unreadNotificationsCount = 0,
  onOpenNotifications,
  onOpenCommandPalette,
  onOpenMobileMenu,
}) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div className="brand">
          <button
            type="button"
            className="mobile-hamburger-btn"
            onClick={onOpenMobileMenu}
            aria-label="Open mobile menu navigation"
            title="Menu"
          >
            <HamburgerIcon />
          </button>
          <div className="brand__mark" aria-hidden="true">
            <span className="brand__glyph">{'{ }'}</span>
          </div>
          <div className="brand__text">
            {courses.length > 1 ? (
              <CourseSelector
                courses={courses}
                activeCourseId={activeCourseId}
                onSwitch={onSwitchCourse}
                variant="header"
              />
            ) : (
              <h1 title={courses[0]?.title}>{courses[0]?.title || 'Course Tracker'}</h1>
            )}
            <p className="brand__sub">Lecture Tracker</p>
          </div>
        </div>

        <div className="header-mid">
          <div className="clock" title="Local time">{formatClock(now)}</div>
          <div className="mini-progress" title={`${pct}% of course complete`}>
            <div className="mini-progress__bar">
              <div style={{ width: `${pct}%` }} />
            </div>
            <span className="mini-progress__label">{pct}%</span>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="header-cmd-trigger"
            onClick={onOpenCommandPalette}
            title="Quick search & actions (Ctrl+K or ⌘K)"
            aria-label="Open command palette"
          >
            <SearchIcon />
            <span className="header-cmd-trigger__text">Search & Actions</span>
            <kbd className="header-cmd-trigger__kbd">⌘K</kbd>
          </button>
          <span className="mobile-pct-badge" title={`Course progress: ${pct}%`}>
            {pct}%
          </span>
          <button
            className={`icon-btn notif-btn ${unreadNotificationsCount > 0 ? 'notif-btn--has-unread' : ''}`}
            onClick={onOpenNotifications}
            title={unreadNotificationsCount > 0 ? `Notifications (${unreadNotificationsCount} unread)` : 'Notifications'}
            aria-label="Open notifications"
          >
            <BellIcon />
            {unreadNotificationsCount > 0 && (
              <span className="notif-badge">{unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}</span>
            )}
          </button>
          <button
            className="icon-btn badges-btn"
            onClick={onOpenBadges}
            title={`Achievements & Badges (${unlockedBadgesCount}/12 unlocked)`}
          >
            <TrophyIcon />
            <span className="badges-count">{unlockedBadgesCount}</span>
          </button>
          <button className="icon-btn streak-btn" onClick={onOpenCalendar} title="Streak calendar">
            <FireIcon />
            <span className="streak-count">{streak}</span>
          </button>
          <button className="icon-btn" onClick={onOpenSettings} title="Settings">
            <GearIcon />
          </button>
        </div>
      </div>

      {/* Pinned horizontal progress bar running across the full width of the header */}
      <div className="header-progress-track" aria-hidden="true" title={`Course progress: ${pct}%`}>
        <div className="header-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </header>
  );
}

function TrophyIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 22h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M18 2H6v7a6 6 0 0 0 12 0V2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill="rgba(255, 213, 74, 0.25)"
      />
    </svg>
  );
}

function FireIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2c1 3-2 4-2 7a2 2 0 0 0 4 0c2 1 3 3 3 5.5A5.5 5.5 0 0 1 6 14.5c0-3 1.5-4.5 3-7 .5 1 1 1.5 1 1.5C10.5 6 11 4 12 2z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="rgba(255, 184, 0, 0.25)"
      />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2.05 2.05 0 1 1-2.9 2.9l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56v.16a2.05 2.05 0 0 1-4.1 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2.05 2.05 0 1 1-2.9-2.9l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03h-.16a2.05 2.05 0 0 1 0-4.1h.09a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2.05 2.05 0 1 1 2.9-2.9l.06.06a1.7 1.7 0 0 0 1.87.34h.08a1.7 1.7 0 0 0 1.03-1.56v-.16a2.05 2.05 0 0 1 4.1 0v.09a1.7 1.7 0 0 0 1.03 1.56h.08a1.7 1.7 0 0 0 1.87-.34l.06-.06a2.05 2.05 0 1 1 2.9 2.9l-.06.06a1.7 1.7 0 0 0-.34 1.87v.08a1.7 1.7 0 0 0 1.56 1.03h.16a2.05 2.05 0 0 1 0 4.1h-.09a1.7 1.7 0 0 0-1.56 1.03z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.73 21a2 2 0 0 1-3.46 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

