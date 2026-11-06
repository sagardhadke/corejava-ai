/**
 * Component Tests: LectureRow
 * Tests: unwatched, watched, in-plan, locked (daily limit), locked (remaining cap).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LectureRow from './LectureRow.jsx';

const MOCK_LECTURE = {
  id: 'l1',
  title: 'Introduction to Java',
  durationSec: 1200,
  durationLabel: '20m',
};

describe('LectureRow', () => {
  let consoleErrors;
  beforeEach(() => {
    consoleErrors = [];
    vi.spyOn(console, 'error').mockImplementation((...args) => consoleErrors.push(args));
  });

  it('renders an unwatched, unplanned lecture', () => {
    render(
      <LectureRow
        lecture={MOCK_LECTURE}
        number={1}
        watched={false}
        inPlan={false}
        onToggleWatched={vi.fn()}
        onTogglePlan={vi.fn()}
        isDailyLimitReached={false}
        todayRemainingCapSec={Infinity}
      />
    );
    expect(screen.getByText('Introduction to Java')).toBeInTheDocument();
    // watch button should be present and not pressed
    const watchBtn = screen.getByRole('button', { name: /mark lecture 1 as watched/i });
    expect(watchBtn).toBeInTheDocument();
    expect(watchBtn).toHaveAttribute('aria-pressed', 'false');
    // plan checkbox should be present
    expect(screen.getByRole('checkbox', { name: /add lecture 1 to today's plan/i })).toBeInTheDocument();
    expect(consoleErrors).toHaveLength(0);
  });

  it('renders a watched lecture with COMPLETED pill', () => {
    render(
      <LectureRow
        lecture={MOCK_LECTURE}
        number={1}
        watched={true}
        inPlan={false}
        onToggleWatched={vi.fn()}
        onTogglePlan={vi.fn()}
        isDailyLimitReached={false}
        todayRemainingCapSec={Infinity}
      />
    );
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    // button should be pressed
    const watchBtn = screen.getByRole('button', { name: /mark lecture 1 as not watched/i });
    expect(watchBtn).toHaveAttribute('aria-pressed', 'true');
    // plan checkbox should be hidden once watched
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(consoleErrors).toHaveLength(0);
  });

  it('renders a planned-but-unwatched lecture with TODAY pill', () => {
    render(
      <LectureRow
        lecture={MOCK_LECTURE}
        number={1}
        watched={false}
        inPlan={true}
        onToggleWatched={vi.fn()}
        onTogglePlan={vi.fn()}
        isDailyLimitReached={false}
        todayRemainingCapSec={Infinity}
      />
    );
    expect(screen.getByText('TODAY')).toBeInTheDocument();
    expect(screen.queryByText('COMPLETED')).not.toBeInTheDocument();
    expect(consoleErrors).toHaveLength(0);
  });

  it('renders a locked lecture when daily limit is reached', () => {
    render(
      <LectureRow
        lecture={MOCK_LECTURE}
        number={1}
        watched={false}
        inPlan={false}
        onToggleWatched={vi.fn()}
        onTogglePlan={vi.fn()}
        isDailyLimitReached={true}
        todayRemainingCapSec={0}
      />
    );
    expect(screen.getByText(/LOCKED/)).toBeInTheDocument();
    // plan checkbox should be hidden when locked
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    // watch button should reference the locked aria label
    const watchBtn = screen.getByRole('button', { name: /locked.*daily 5-hour limit/i });
    expect(watchBtn).toBeInTheDocument();
    expect(consoleErrors).toHaveLength(0);
  });

  it('renders a locked lecture when remaining cap is insufficient', () => {
    render(
      <LectureRow
        lecture={MOCK_LECTURE}
        number={2}
        watched={false}
        inPlan={false}
        onToggleWatched={vi.fn()}
        onTogglePlan={vi.fn()}
        isDailyLimitReached={false}
        todayRemainingCapSec={600} // 10m remaining, lecture is 20m
      />
    );
    expect(screen.getByText(/LOCKED/)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(consoleErrors).toHaveLength(0);
  });

  it('calls onToggleWatched when watch button is clicked', async () => {
    const onToggleWatched = vi.fn();
    const user = userEvent.setup();
    render(
      <LectureRow
        lecture={MOCK_LECTURE}
        number={1}
        watched={false}
        inPlan={false}
        onToggleWatched={onToggleWatched}
        onTogglePlan={vi.fn()}
        isDailyLimitReached={false}
        todayRemainingCapSec={Infinity}
      />
    );
    await user.click(screen.getByRole('button', { name: /mark lecture 1 as watched/i }));
    expect(onToggleWatched).toHaveBeenCalledWith('l1', MOCK_LECTURE);
    expect(consoleErrors).toHaveLength(0);
  });

  it('calls onTogglePlan when plan checkbox is changed', async () => {
    const onTogglePlan = vi.fn();
    const user = userEvent.setup();
    render(
      <LectureRow
        lecture={MOCK_LECTURE}
        number={1}
        watched={false}
        inPlan={false}
        onToggleWatched={vi.fn()}
        onTogglePlan={onTogglePlan}
        isDailyLimitReached={false}
        todayRemainingCapSec={Infinity}
      />
    );
    await user.click(screen.getByRole('checkbox', { name: /add lecture 1 to today's plan/i }));
    expect(onTogglePlan).toHaveBeenCalledWith('l1');
    expect(consoleErrors).toHaveLength(0);
  });

  it('allows toggling plan checkbox via keyboard Space', async () => {
    const user = userEvent.setup();
    const onTogglePlan = vi.fn();
    render(
      <LectureRow
        lecture={MOCK_LECTURE}
        number={1}
        watched={false}
        inPlan={false}
        onToggleWatched={vi.fn()}
        onTogglePlan={onTogglePlan}
        isDailyLimitReached={false}
        todayRemainingCapSec={Infinity}
      />
    );
    const checkbox = screen.getByRole('checkbox', { name: /add lecture 1 to today's plan/i });
    checkbox.focus();
    await user.keyboard(' ');
    expect(onTogglePlan).toHaveBeenCalledWith('l1');
    expect(consoleErrors).toHaveLength(0);
  });

  it('renders correctly when lecture has no durationLabel', () => {
    const noLabel = { ...MOCK_LECTURE, durationLabel: undefined };
    render(
      <LectureRow
        lecture={noLabel}
        number={3}
        watched={false}
        inPlan={false}
        onToggleWatched={vi.fn()}
        onTogglePlan={vi.fn()}
        isDailyLimitReached={false}
        todayRemainingCapSec={Infinity}
      />
    );
    // Should not crash even with missing durationLabel
    expect(screen.getByText('Introduction to Java')).toBeInTheDocument();
    expect(consoleErrors).toHaveLength(0);
  });
});
