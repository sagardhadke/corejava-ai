import { formatDuration } from '../utils/time';
import './StatsBar.css';

export default function StatsBar({ stats, targetSec, autoPlan }) {
  const targetRemaining = Math.max(0, targetSec - stats.plannedWatchedSec);
  const targetHit = stats.plannedWatchedSec >= targetSec && stats.plannedCount > 0;

  return (
    <div className="stats-bar">
      <div className="stat-card stat-card--hero">
        <div className="stat-card__label">Course progress</div>
        <div className="stat-card__hero-row">
          <div className="stat-card__value">{stats.pct}%</div>
          <div className="stat-card__sub">{stats.watchedCount}/{stats.totalCount} lectures</div>
        </div>
        <div className="progress-track">
          <div className="progress-track__fill" style={{ width: `${stats.pct}%` }} />
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-card__label">Watched</div>
        <div className="stat-card__value stat-card__value--sm">{formatDuration(stats.watchedSec)}</div>
        <div className="stat-card__sub">of {formatDuration(stats.totalSec)} total</div>
      </div>

      <div className="stat-card">
        <div className="stat-card__label">Remaining</div>
        <div className="stat-card__value stat-card__value--sm">{formatDuration(stats.remainingSec)}</div>
        <div className="stat-card__sub">left in the course</div>
      </div>

      <div className="stat-card stat-card--amber">
        <div className="stat-card__label">Today's plan {autoPlan && <span className="auto-tag">AUTO</span>}</div>
        <div className="stat-card__value stat-card__value--sm">{formatDuration(stats.todaySelectedSec)}</div>
        <div className="stat-card__sub">{stats.plannedCount} lecture{stats.plannedCount === 1 ? '' : 's'} selected</div>
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
