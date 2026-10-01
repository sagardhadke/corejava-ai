import './MobileBottomNav.css';

/**
 * MobileBottomNav
 *
 * Implements the pinned bottom navigation bar for mobile viewports,
 * matching Screenshot 2 specifications with 5 primary destinations:
 * Home, Today, Streak, Badges, and Settings.
 */
export default function MobileBottomNav({
  activeTab = 'home',
  streak = 0,
  planCount = 0,
  unlockedBadgesCount = 0,
  onNavigateHome,
  onNavigateToday,
  onOpenStreak,
  onOpenBadges,
  onOpenSettings,
}) {
  return (
    <nav className="mobile-bottom-nav" aria-label="Bottom Navigation">
      <div className="mobile-bottom-nav__inner">
        {/* 1. Home */}
        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'home' ? 'active' : ''}`}
          onClick={onNavigateHome}
          aria-label="Home Syllabus"
        >
          <div className="mobile-nav-btn__icon-wrap">
            <HomeIcon />
          </div>
          <span className="mobile-nav-btn__label">Home</span>
        </button>

        {/* 2. Today's Plan */}
        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'today' ? 'active' : ''}`}
          onClick={onNavigateToday}
          aria-label="Today's Plan"
        >
          <div className="mobile-nav-btn__icon-wrap">
            <TodayIcon />
            {planCount > 0 && (
              <span className="mobile-nav-badge">{planCount}</span>
            )}
          </div>
          <span className="mobile-nav-btn__label">Today</span>
        </button>

        {/* 3. Streak & Shields */}
        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'streak' ? 'active' : ''}`}
          onClick={onOpenStreak}
          aria-label="Streak and Shields"
        >
          <div className="mobile-nav-btn__icon-wrap">
            <FireNavIcon />
            {streak > 0 && (
              <span className="mobile-nav-badge mobile-nav-badge--fire">{streak}</span>
            )}
          </div>
          <span className="mobile-nav-btn__label">Streak</span>
        </button>

        {/* 4. Badges & Achievements */}
        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'badges' ? 'active' : ''}`}
          onClick={onOpenBadges}
          aria-label="Achievements and Badges"
        >
          <div className="mobile-nav-btn__icon-wrap">
            <TrophyNavIcon />
            {unlockedBadgesCount > 0 && (
              <span className="mobile-nav-badge mobile-nav-badge--gold">{unlockedBadgesCount}</span>
            )}
          </div>
          <span className="mobile-nav-btn__label">Badges</span>
        </button>

        {/* 5. Settings */}
        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={onOpenSettings}
          aria-label="Settings"
        >
          <div className="mobile-nav-btn__icon-wrap">
            <GearNavIcon />
          </div>
          <span className="mobile-nav-btn__label">Settings</span>
        </button>
      </div>
    </nav>
  );
}

/* ---- Bottom Nav SVGs ---- */

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1V9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TodayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="15" r="1.5" fill="currentColor" />
    </svg>
  );
}

function FireNavIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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

function TrophyNavIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 3h12v7a6 6 0 0 1-12 0V3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 16v3M8 21h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GearNavIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
