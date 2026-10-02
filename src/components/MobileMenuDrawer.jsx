import { useEffect } from 'react';
import './MobileMenuDrawer.css';

/**
 * MobileMenuDrawer
 *
 * Slide-out navigation drawer for mobile viewports.
 * Uses the native Amber Gold / Dark Charcoal theme matching the Core Java enterprise design.
 * Provides authentic course navigation, streak info, badges, practice logging,
 * command palette, settings, and backup tools.
 */
export default function MobileMenuDrawer({
  open,
  onClose,
  course,
  courses = [],
  activeCourseId,
  onSwitchCourse,
  stats,
  pct = 0,
  streak = 0,
  availableFreezes = 2,
  unlockedBadgesCount = 0,
  onOpenPlan,
  onOpenStreak,
  onOpenBadges,
  onOpenSettings,
  onOpenCommandPalette,
  onOpenPracticeModal,
  onOpenImport,
  onExportBackup,
}) {
  // Close on Escape key press
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const handleNav = (action) => {
    onClose();
    if (typeof action === 'function') {
      setTimeout(action, 120);
    }
  };

  const handleScrollTo = (id) => {
    onClose();
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 120);
  };

  return (
    <div className="mobile-drawer-root" role="dialog" aria-modal="true" aria-label="Mobile Navigation">
      {/* Backdrop Overlay */}
      <div className="mobile-drawer-backdrop" onClick={onClose} aria-hidden="true" />

      {/* Slide-out Drawer Container */}
      <aside className="mobile-drawer-panel">
        {/* Drawer Header with Authentic Gold Brand Mark */}
        <div className="mobile-drawer-header">
          <div className="mobile-drawer-brand">
            <div className="mobile-drawer-mark" aria-hidden="true">
              <span className="mobile-drawer-glyph">{'{ }'}</span>
            </div>
            <div className="mobile-drawer-brand-text">
              <h2 className="mobile-drawer-title">{course?.title || 'Core Java + AI'}</h2>
              <span className="mobile-drawer-subtitle">Enterprise Lecture Tracker</span>
            </div>
          </div>
          <button
            type="button"
            className="mobile-drawer-close-btn"
            onClick={onClose}
            aria-label="Close navigation"
          >
            ✕
          </button>
        </div>

        {/* Navigation Items (Amber Gold Theme) */}
        <nav className="mobile-drawer-nav">
          <ul className="mobile-drawer-menu">
            <li>
              <button
                type="button"
                className="mobile-menu-item"
                onClick={() => handleScrollTo('syllabus-section')}
              >
                <span className="mobile-menu-icon">
                  <GridIcon />
                </span>
                <span className="mobile-menu-label">Home & Syllabus</span>
              </button>
            </li>

            <li>
              <button
                type="button"
                className="mobile-menu-item"
                onClick={() => (onOpenPlan ? handleNav(onOpenPlan) : handleScrollTo('today-plan-card'))}
              >
                <span className="mobile-menu-icon">
                  <CalendarDayIcon />
                </span>
                <span className="mobile-menu-label">Today's Plan</span>
                {stats?.planCount > 0 && (
                  <span className="mobile-menu-badge">{stats.planCount}</span>
                )}
              </button>
            </li>

            <li>
              <button
                type="button"
                className="mobile-menu-item"
                onClick={() => handleNav(onOpenStreak)}
              >
                <span className="mobile-menu-icon">
                  <FireIcon />
                </span>
                <span className="mobile-menu-label">Streak & Shields</span>
                <div className="mobile-menu-streak-tag">
                  <span className="mobile-menu-tag-fire">🔥 {streak}</span>
                  <span className="mobile-menu-tag-shield">🛡️ {availableFreezes}</span>
                </div>
              </button>
            </li>

            <li>
              <button
                type="button"
                className="mobile-menu-item"
                onClick={() => handleNav(onOpenBadges)}
              >
                <span className="mobile-menu-icon">
                  <TrophyIcon />
                </span>
                <span className="mobile-menu-label">Achievements & Badges</span>
                <span className="mobile-menu-badge mobile-menu-badge--gold">
                  {unlockedBadgesCount}/12
                </span>
              </button>
            </li>

            <li>
              <button
                type="button"
                className="mobile-menu-item"
                onClick={() => handleNav(onOpenPracticeModal)}
              >
                <span className="mobile-menu-icon">
                  <PencilNavIcon />
                </span>
                <span className="mobile-menu-label">Log Practice Day</span>
              </button>
            </li>

            <li>
              <button
                type="button"
                className="mobile-menu-item"
                onClick={() => handleNav(onOpenCommandPalette)}
              >
                <span className="mobile-menu-icon">
                  <SearchMenuIcon />
                </span>
                <span className="mobile-menu-label">Search & Actions</span>
                <kbd className="mobile-menu-kbd">⌘K</kbd>
              </button>
            </li>

            <li>
              <button
                type="button"
                className="mobile-menu-item"
                onClick={() => handleNav(() => window.dispatchEvent(new CustomEvent('jct:show_motivation')))}
              >
                <span className="mobile-menu-icon">
                  ✨
                </span>
                <span className="mobile-menu-label">Daily Motivation</span>
              </button>
            </li>

            <li>
              <button
                type="button"
                className="mobile-menu-item"
                onClick={() => handleNav(onOpenSettings)}
              >
                <span className="mobile-menu-icon">
                  <GearIcon />
                </span>
                <span className="mobile-menu-label">Course Settings</span>
              </button>
            </li>

            {onOpenImport && (
              <li>
                <button
                  type="button"
                  className="mobile-menu-item"
                  onClick={() => handleNav(onOpenImport)}
                >
                  <span className="mobile-menu-icon">
                    <ImportIcon />
                  </span>
                  <span className="mobile-menu-label">Import Course (XML)</span>
                </button>
              </li>
            )}

            {onExportBackup && (
              <li>
                <button
                  type="button"
                  className="mobile-menu-item"
                  onClick={() => handleNav(onExportBackup)}
                >
                  <span className="mobile-menu-icon">
                    <DownloadIcon />
                  </span>
                  <span className="mobile-menu-label">Backup & Export</span>
                </button>
              </li>
            )}
          </ul>
        </nav>

        {/* Drawer Footer Controls */}
        <div className="mobile-drawer-footer">
          {/* Course Switcher (if multiple courses) */}
          {courses.length > 1 && (
            <div className="mobile-drawer-course-switch">
              <span className="mobile-drawer-label">Active Course</span>
              <select
                className="mobile-drawer-select"
                value={activeCourseId}
                onChange={(e) => {
                  onSwitchCourse(e.target.value);
                  onClose();
                }}
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Course Progress Mini Bar */}
          <div className="mobile-drawer-progress-card">
            <div className="mobile-drawer-progress-info">
              <span>Overall Progress</span>
              <strong>{pct}%</strong>
            </div>
            <div className="mobile-drawer-progress-track">
              <div className="mobile-drawer-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="mobile-drawer-stats-sub">
              <span>{stats?.watchedCount || 0} of {stats?.totalCount || 0} lectures watched</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ---- Amber / Gold Theme SVGs ---- */

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function CalendarDayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function FireIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2c-.5 2-2 3.5-3 5.5-1.5 3-1 6.5 1 9 0-1.5.5-2.5 1.5-3.5 1 2 2.5 3 2.5 5 2.5-1.5 4-4.5 4-7.5 0-3-2-5.5-4-7-1 2-2 2.5-2 3.5 0-2 0-3.5 0-5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 3h12v7a6 6 0 0 1-12 0V3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 16v3M8 21h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PencilNavIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function SearchMenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ImportIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="7 3 7 8 15 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
