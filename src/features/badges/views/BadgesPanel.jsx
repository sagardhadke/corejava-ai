import Drawer from '../../../components/Drawer';
import BadgeIcon from './BadgeIcon';
import './BadgesPanel.css';

export default function BadgesPanel({
  open,
  onClose,
  viewModel,
  // Direct props fallback for flexible composition
  badges = viewModel?.badges || [],
  courseTitle = viewModel?.courseTitle || 'Course',
}) {
  const vm = viewModel;

  const unlockedCount = vm?.unlockedCount ?? badges.filter((b) => b.isUnlocked).length;
  const totalCount = vm?.totalCount ?? (badges.length || 12);
  const rank = vm?.rank ?? { level: 1, title: 'Aspiring Achiever', desc: 'Begin your streak or complete 10% to unlock your first badge.' };
  const overallPct = vm?.overallPct ?? Math.round((unlockedCount / totalCount) * 100);

  const completionBadges = vm?.completionBadges ?? badges.filter((b) => b.category === 'completion');
  const streakBadges = vm?.streakBadges ?? badges.filter((b) => b.category === 'streak');
  const completionUnlocked = vm?.completionUnlocked ?? completionBadges.filter((b) => b.isUnlocked).length;
  const streakUnlocked = vm?.streakUnlocked ?? streakBadges.filter((b) => b.isUnlocked).length;

  const nextMilestone = vm?.nextMilestone ?? (completionBadges.find((b) => !b.isUnlocked) || streakBadges.find((b) => !b.isUnlocked));
  const filteredBadges = vm?.filteredBadges ?? badges;
  const selectedTab = vm?.selectedTab ?? 'all';
  const inspectBadge = vm?.inspectBadge ?? null;
  const copied = vm?.copied ?? false;

  const handleSelectTab = (tab) => vm?.setTab?.(tab);
  const handleOpenInspect = (b) => vm?.openInspect?.(b);
  const handleCloseInspect = () => vm?.closeInspect?.();
  const handleCopyShare = (b) => vm?.copyShare?.(b);

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        title="Achievements & Badges"
        side="right"
        className="badges-drawer"
      >
        {/* Overall Rank & Summary Hero */}
        <div className="badges-hero">
          <div className="badges-hero__glow" />
          <div className="badges-hero__top">
            <div className="badges-hero__rank-wrap">
              <div className="badges-hero__trophy" aria-hidden="true">
                <TrophyIcon />
              </div>
              <div className="badges-hero__rank-info">
                <div className="badges-hero__rank-tag">{courseTitle} · Milestone Rank · Lv {rank.level}</div>
                <div className="badges-hero__rank-title">{rank.title}</div>
              </div>
            </div>
            <div className="badges-hero__count-box">
              <div className="badges-hero__count-num">
                {unlockedCount} <span style={{ fontSize: '14px', color: 'var(--ink-faint)' }}>/ {totalCount}</span>
              </div>
              <div className="badges-hero__count-label">{overallPct}% Unlocked</div>
            </div>
          </div>

          <p className="badges-hero__desc">{rank.desc}</p>

          <div className="badges-progress-track">
            <div className="badges-progress-fill" style={{ width: `${overallPct}%` }} />
          </div>

          <div className="badges-hero__chips">
            <span className={`badge-chip ${completionUnlocked > 0 ? 'badge-chip--active' : ''}`}>
              🎓 Course: {completionUnlocked} / {completionBadges.length}
            </span>
            <span className={`badge-chip ${streakUnlocked > 0 ? 'badge-chip--active' : ''}`}>
              🔥 Streak: {streakUnlocked} / {streakBadges.length}
            </span>
          </div>
        </div>

        {/* Next Up Spotlight */}
        {nextMilestone && (
          <div className="badge-next-card">
            <div className="badge-next-card__icon">
              <BadgeIcon
                id={nextMilestone.id}
                isUnlocked={false}
                size={38}
              />
            </div>
            <div className="badge-next-card__body">
              <div className="badge-next-card__tag">Next Milestone In Reach</div>
              <div className="badge-next-card__title">
                {nextMilestone.title} ({nextMilestone.subtitle})
              </div>
              <div className="badge-next-card__info">
                {nextMilestone.category === 'completion'
                  ? `${nextMilestone.remainingToUnlock}% course lectures remaining to unlock`
                  : `${nextMilestone.remainingToUnlock} days remaining to reach this streak`}
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="badges-tabs">
          <button
            className={`badge-tab ${selectedTab === 'all' ? 'badge-tab--active' : ''}`}
            onClick={() => handleSelectTab('all')}
          >
            All Badges ({totalCount})
          </button>
          <button
            className={`badge-tab ${selectedTab === 'completion' ? 'badge-tab--active' : ''}`}
            onClick={() => handleSelectTab('completion')}
          >
            Course ({completionUnlocked}/{completionBadges.length})
          </button>
          <button
            className={`badge-tab ${selectedTab === 'streak' ? 'badge-tab--active' : ''}`}
            onClick={() => handleSelectTab('streak')}
          >
            Streak ({streakUnlocked}/{streakBadges.length})
          </button>
          <button
            className={`badge-tab ${selectedTab === 'unlocked' ? 'badge-tab--active' : ''}`}
            onClick={() => handleSelectTab('unlocked')}
          >
            Unlocked ({unlockedCount})
          </button>
          <button
            className={`badge-tab ${selectedTab === 'locked' ? 'badge-tab--active' : ''}`}
            onClick={() => handleSelectTab('locked')}
          >
            Locked ({totalCount - unlockedCount})
          </button>
        </div>

        {/* Badges Grid */}
        <div className="badges-grid">
          {filteredBadges.map((badge) => (
            <div
              key={badge.id}
              className={`badge-card ${badge.isUnlocked ? 'badge-card--unlocked' : ''}`}
              onClick={() => handleOpenInspect(badge)}
              title={`${badge.title} - Click for details`}
            >
              <div className="badge-card__top-badge">
                <span className="badge-card__tier-pill">{badge.tierLabel}</span>
              </div>

              <div className="badge-card__emblem">
                <BadgeIcon id={badge.id} isUnlocked={badge.isUnlocked} size={50} />
              </div>

              <div className="badge-card__title">{badge.title}</div>
              <div className="badge-card__subtitle">{badge.subtitle}</div>
              <div className="badge-card__desc">{badge.description}</div>

              <div className="badge-card__status">
                {badge.isUnlocked ? (
                  <span className="badge-card__unlocked-pill">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {badge.unlockedAt ? `Unlocked ${formatDate(badge.unlockedAt)}` : 'Unlocked'}
                  </span>
                ) : (
                  <div className="badge-card__locked-box">
                    <div className="badge-card__locked-track">
                      <div className="badge-card__locked-fill" style={{ width: `${badge.progress}%` }} />
                    </div>
                    <div className="badge-card__locked-text">
                      <span>{badge.currentValue}{badge.unit}</span>
                      <span>{badge.threshold}{badge.unit}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Drawer>

      {/* Inspect Detail Modal */}
      {inspectBadge && (
        <div className="badge-modal-backdrop" onClick={handleCloseInspect}>
          <div className="badge-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              className="badge-modal__close"
              onClick={handleCloseInspect}
              aria-label="Close"
            >
              ✕
            </button>

            <div className="badge-modal__tier-tag">{inspectBadge.tierLabel}</div>
            <div className="badge-modal__title">{inspectBadge.title}</div>
            <div className="badge-modal__subtitle">{inspectBadge.subtitle}</div>

            <div className="badge-modal__emblem-wrap">
              <BadgeIcon id={inspectBadge.id} isUnlocked={inspectBadge.isUnlocked} size={84} />
            </div>

            <p className="badge-modal__desc">{inspectBadge.description}</p>

            <div className="badge-modal__status-box">
              {inspectBadge.isUnlocked ? (
                <div style={{ color: 'var(--good)', fontWeight: 700, fontSize: '13px' }}>
                  ✓ Unlocked on {inspectBadge.unlockedAt ? formatDate(inspectBadge.unlockedAt) : 'this device'}
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--ink-soft)', marginBottom: '6px' }}>
                    <span>Progress: {inspectBadge.progress}%</span>
                    <span>{inspectBadge.currentValue} / {inspectBadge.threshold}{inspectBadge.unit}</span>
                  </div>
                  <div className="badges-progress-track" style={{ height: '6px', margin: 0 }}>
                    <div className="badges-progress-fill" style={{ width: `${inspectBadge.progress}%` }} />
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--amber)', marginTop: '8px' }}>
                    {inspectBadge.remainingToUnlock}{inspectBadge.unit} more needed to achieve this milestone
                  </div>
                </div>
              )}
            </div>

            <div className="badge-modal__actions">
              {inspectBadge.isUnlocked && (
                <button
                  className="badge-modal__btn badge-modal__btn--primary"
                  onClick={() => handleCopyShare(inspectBadge)}
                >
                  {copied ? '✓ Copied to Clipboard!' : 'Share Achievement'}
                </button>
              )}
              <button
                className="badge-modal__btn badge-modal__btn--secondary"
                onClick={handleCloseInspect}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function formatDate(isoOrDateStr) {
  try {
    const d = new Date(isoOrDateStr);
    if (isNaN(d.getTime())) return 'Recently';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Recently';
  }
}

function TrophyIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" fill="rgba(255, 184, 0, 0.2)" />
    </svg>
  );
}
