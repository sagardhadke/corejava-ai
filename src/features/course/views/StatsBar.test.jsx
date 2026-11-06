/**
 * Component Tests: StatsBar
 * Tests: render, empty state, populated state, near-complete (90%+) chip, daily target hit.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StatsBar from './StatsBar.jsx';

const EMPTY_STATS = {
  watchedCount: 0,
  totalCount: 0,
  watchedSec: 0,
  remainingSec: 0,
  totalSec: 0,
  pct: 0,
  plannedCount: 0,
  plannedSec: 0,
  plannedWatchedCount: 0,
  plannedWatchedSec: 0,
  plannedRemainingSec: 0,
  todaySelectedSec: 0,
};

const POPULATED_STATS = {
  watchedCount: 50,
  totalCount: 150,
  watchedSec: 90000,  // 25h
  remainingSec: 180000,
  totalSec: 270000,
  pct: 33,
  plannedCount: 3,
  plannedSec: 5400,
  plannedWatchedCount: 1,
  plannedWatchedSec: 1800,
  plannedRemainingSec: 3600,
  todaySelectedSec: 5400,
};

const NEAR_COMPLETE_STATS = { ...POPULATED_STATS, pct: 92, plannedWatchedSec: 7200, plannedCount: 4 };
const TARGET_HIT_STATS = {
  ...POPULATED_STATS,
  plannedWatchedSec: 6000, // > targetSec of 5400
  plannedCount: 4,
};

const TARGET_SEC = 5400; // 1.5h

describe('StatsBar', () => {
  let consoleErrors;
  beforeEach(() => {
    consoleErrors = [];
    vi.spyOn(console, 'error').mockImplementation((...args) => {
      consoleErrors.push(args);
    });
  });

  it('renders without crashing with empty stats', () => {
    render(<StatsBar stats={EMPTY_STATS} targetSec={TARGET_SEC} autoPlan={false} />);
    expect(screen.getByText('Course progress')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('0/0 lectures')).toBeInTheDocument();
    expect(consoleErrors).toHaveLength(0);
  });

  it('renders with populated stats', () => {
    render(<StatsBar stats={POPULATED_STATS} targetSec={TARGET_SEC} autoPlan={false} />);
    expect(screen.getByText('33%')).toBeInTheDocument();
    expect(screen.getByText('50/150 lectures')).toBeInTheDocument();
    expect(screen.getByText('3 lectures selected')).toBeInTheDocument();
    expect(consoleErrors).toHaveLength(0);
  });

  it('shows AUTO tag when autoPlan is true', () => {
    render(<StatsBar stats={POPULATED_STATS} targetSec={TARGET_SEC} autoPlan={true} />);
    expect(screen.getByText('AUTO')).toBeInTheDocument();
    expect(consoleErrors).toHaveLength(0);
  });

  it('does NOT show AUTO tag when autoPlan is false', () => {
    render(<StatsBar stats={POPULATED_STATS} targetSec={TARGET_SEC} autoPlan={false} />);
    expect(screen.queryByText('AUTO')).not.toBeInTheDocument();
  });

  it('shows Complete chip when pct >= 90', () => {
    render(<StatsBar stats={NEAR_COMPLETE_STATS} targetSec={TARGET_SEC} autoPlan={false} />);
    expect(screen.getByRole('button', { name: /complete/i })).toBeInTheDocument();
    expect(consoleErrors).toHaveLength(0);
  });

  it('does NOT show Complete chip when pct < 90', () => {
    render(<StatsBar stats={POPULATED_STATS} targetSec={TARGET_SEC} autoPlan={false} />);
    expect(screen.queryByRole('button', { name: /complete/i })).not.toBeInTheDocument();
  });

  it('Complete chip dispatches jct:open_completion_modal event', () => {
    const handler = vi.fn();
    window.addEventListener('jct:open_completion_modal', handler);
    render(<StatsBar stats={NEAR_COMPLETE_STATS} targetSec={TARGET_SEC} autoPlan={false} />);
    fireEvent.click(screen.getByRole('button', { name: /complete/i }));
    expect(handler).toHaveBeenCalledOnce();
    window.removeEventListener('jct:open_completion_modal', handler);
  });

  it('shows daily target hit indicator when planned watched >= targetSec', () => {
    render(<StatsBar stats={TARGET_HIT_STATS} targetSec={TARGET_SEC} autoPlan={false} />);
    expect(screen.getByText('🎯 hit')).toBeInTheDocument();
    expect(screen.getByText('goal reached today')).toBeInTheDocument();
    expect(consoleErrors).toHaveLength(0);
  });

  it('shows remaining time when target not hit', () => {
    render(<StatsBar stats={POPULATED_STATS} targetSec={TARGET_SEC} autoPlan={false} />);
    expect(screen.getByText('left to reach goal')).toBeInTheDocument();
  });

  it('shows singular "lecture" when plannedCount is 1', () => {
    const stats = { ...POPULATED_STATS, plannedCount: 1 };
    render(<StatsBar stats={stats} targetSec={TARGET_SEC} autoPlan={false} />);
    expect(screen.getByText('1 lecture selected')).toBeInTheDocument();
  });

  it('renders with null/undefined stats without crashing', () => {
    // Defensive: null stats should not throw
    render(<StatsBar stats={null} targetSec={TARGET_SEC} autoPlan={false} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
