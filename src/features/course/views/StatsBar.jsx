import { formatDuration } from '../../../utils/time.js';
import './StatsBar.css';

export default function StatsBar({ stats, targetSec, autoPlan }) {
  const targetRemaining = Math.max(0, targetSec - (stats?.plannedWatchedSec || 0));
  const targetHit = (stats?.plannedWatchedSec || 0) >= targetSec && (stats?.plannedCount || 0) > 0;
  const isNearComplete = (stats?.pct || 0) >= 90;

  return (
    <div className="stats-bar">
      <div className="stat-card stat-card--hero">
        <div className="stat-card__label-row">
          <div className="stat-card__label">Course progress</div>
          {isNearComplete && (
            <button
              type="button"
              className="stat-card__complete-chip"
              onClick={() => window.dispatchEvent(new CustomEvent('jct:open_completion_modal'))}
              title="Click to initiate 8-digit PIN completion verification"
            >
              ✓ Complete
            </button>
          )}
        </div>
        <div className="stat-card__hero-row">
          <div className="stat-card__value">{stats?.pct || 0}%</div>
          <div className="stat-card__sub">{stats?.watchedCount || 0}/{stats?.totalCount || 0} lectures</div>
        </div>
        <div className="progress-track">
          <div className="progress-track__fill" style={{ width: `${stats?.pct || 0}%` }} />
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card__label">Watched</div>
        <div className="stat-card__value stat-card__value--sm">{formatDuration(stats?.watchedSec || 0)}</div>
        <div className="stat-card__sub">of {formatDuration(stats?.totalSec || 0)} total</div>
      </div>

      <div className="stat-card">
        <div className="stat-card__label">Remaining</div>
        <div className="stat-card__value stat-card__value--sm">{formatDuration(stats?.remainingSec || 0)}</div>
        <div className="stat-card__sub">left in the course</div>
      </div>

      <div className="stat-card stat-card--amber">
        <div className="stat-card__label">Today's plan {autoPlan && <span className="auto-tag">AUTO</span>}</div>
        <div className="stat-card__value stat-card__value--sm">{formatDuration(stats?.todaySelectedSec || 0)}</div>
        <div className="stat-card__sub">{stats?.plannedCount || 0} lecture{stats?.plannedCount === 1 ? '' : 's'} selected</div>
      </div>

      <div className={`stat-card ${targetHit ? 'stat-card--good' : ''}`}>
        <div className="stat-card__label">Daily target</div>
        <div className="stat-card__value stat-card__value--sm">
          {targetHit ? '🎯 hit' : formatDuration(targetRemaining)}
        </div>
        <div className="stat-card__sub">{targetHit ? 'goal reached today' : 'left to reach goal'}</div>
      </div>
    </div>
  );
}
