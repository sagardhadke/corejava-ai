import { useEffect, useState } from 'react';
import './MobileMenuDrawer.css';

/**
 * MobileMenuDrawer
 *
 * Implements a slide-out navigation drawer from the left side,
 * matching the user's mobile screenshot specifications.
 * Includes course switching, navigation links, quick actions,
 * language switcher pills, and theme toggle.
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
  const [activeLang, setActiveLang] = useState('EN');
  const [isLightMode, setIsLightMode] = useState(false);

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

  const toggleTheme = () => {
    const next = !isLightMode;
    setIsLightMode(next);
    document.body.classList.toggle('theme-light-preview', next);
  };

  return (
    <div className="mobile-drawer-root" role="dialog" aria-modal="true" aria-label="Mobile Navigation">
      {/* Backdrop Overlay */}
      <div className="mobile-drawer-backdrop" onClick={onClose} aria-hidden="true" />

      {/* Slide-out Drawer Container */}
      <aside className="mobile-drawer-panel">
        {/* Drawer Header */}
        <div className="mobile-drawer-header">
          <div className="mobile-drawer-brand">
            <div className="mobile-drawer-mark" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 12h3l2-4 3 8 2-4h3" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="mobile-drawer-brand-text">
              <h2 className="mobile-drawer-title">{course?.title || 'CoreJava AI'}</h2>
              <span className="mobile-drawer-subtitle">Learning & Track Platform</span>
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

        {/* Navigation Items (Styling & Red Icons matching Screenshot 1) */}
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
                <span className="mobile-menu-label">Home</span>
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
                  <ShieldIcon />
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
                <span className="mobile-menu-label">Achievements</span>
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
                  <CertificateIcon />
                </span>
                <span className="mobile-menu-label">Certifications & Practice</span>
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
                onClick={() => handleNav(onOpenSettings)}
              >
                <span className="mobile-menu-icon">
                  <GearIcon />
                </span>
                <span className="mobile-menu-label">Settings</span>
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

        {/* Drawer Footer Controls (Matching Screenshot 1) */}
        <div className="mobile-drawer-footer">
          {/* Course Switcher (if multiple courses) */}
          {courses.length > 1 && (
            <div className="mobile-drawer-course-switch">
              <span className="mobile-drawer-label">Switch Course</span>
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

          {/* Switch Language Pills (EN, HI, MR matching Screenshot 1) */}
          <div className="mobile-drawer-lang-row">
            <span className="mobile-drawer-label">Switch Language</span>
            <div className="mobile-drawer-lang-pills">
              {['EN', 'HI', 'MR'].map((lang) => (
                <button
                  key={lang}
                  type="button"
                  className={`mobile-lang-pill ${activeLang === lang ? 'active' : ''}`}
                  onClick={() => setActiveLang(lang)}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle Theme Action (Matching Screenshot 1) */}
          <button
            type="button"
            className="mobile-drawer-theme-btn"
            onClick={toggleTheme}
          >
            <div className="mobile-drawer-theme-left">
              <span className="mobile-drawer-theme-icon">{isLightMode ? '🌙' : '☀️'}</span>
              <span>Toggle theme</span>
            </div>
            <span className="mobile-drawer-theme-arrow">›</span>
          </button>

          {/* Progress Mini Stat */}
          <div className="mobile-drawer-progress-info">
            <span>Course Progress</span>
            <strong>{pct}%</strong>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ---- Red Accent Outline SVGs matching Screenshot 1 ---- */

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#ef4444" strokeWidth="2" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="#ef4444" strokeWidth="2" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="#ef4444" strokeWidth="2" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="#ef4444" strokeWidth="2" />
    </svg>
  );
}

function CalendarDayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="#ef4444" strokeWidth="2" />
      <path d="M16 2v4M8 2v4M3 10h18" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 22h16M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1s.45 1 1 1h8c.55 0 1-.45 1-1s-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 4h12v6c0 3.31-2.69 6-6 6s-6-2.69-6-6V4z" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CertificateIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="14 2 14 8 20 8" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="16" y1="13" x2="8" y2="13" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="16" y1="17" x2="8" y2="17" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchMenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="8" stroke="#ef4444" strokeWidth="2" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="3" stroke="#ef4444" strokeWidth="2" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ImportIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="17 21 17 13 7 13 7 21" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="7 3 7 8 15 8" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
