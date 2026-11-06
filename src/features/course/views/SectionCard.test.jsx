/**
 * Component Tests: SectionCard
 * Tests: collapsed/expanded, complete state, today dot, toggle, lecture rendering.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SectionCard from './SectionCard.jsx';

const MOCK_SECTION = {
  id: 'sec-1',
  number: '01',
  title: 'Java Basics',
  isProject: false,
  lectures: [
    { id: 'l1', title: 'Introduction to Java', durationSec: 1200, durationLabel: '20m' },
    { id: 'l2', title: 'Variables and Types', durationSec: 900, durationLabel: '15m' },
  ],
};

const LECTURE_NUMBERS = new Map([['l1', 1], ['l2', 2]]);

describe('SectionCard', () => {
  let consoleErrors;
  beforeEach(() => {
    consoleErrors = [];
    vi.spyOn(console, 'error').mockImplementation((...args) => consoleErrors.push(args));
  });

  it('renders collapsed section header without lecture list', () => {
    render(
      <SectionCard
        section={MOCK_SECTION}
        isOpen={false}
        onToggleOpen={vi.fn()}
        watchedSet={new Set()}
        planSet={new Set()}
        onToggleWatched={vi.fn()}
        onTogglePlan={vi.fn()}
        lectureNumbers={LECTURE_NUMBERS}
        isDailyLimitReached={false}
        todayRemainingCapSec={Infinity}
      />
    );
    expect(screen.getByText('Java Basics')).toBeInTheDocument();
    // Lectures should NOT be visible when collapsed
    expect(screen.queryByText('Introduction to Java')).not.toBeInTheDocument();
    // Toggle button should have aria-expanded=false
    const btn = screen.getByRole('button', { name: /01.*Java Basics/i });
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    expect(consoleErrors).toHaveLength(0);
  });

  it('renders expanded section with lecture rows', () => {
    render(
      <SectionCard
        section={MOCK_SECTION}
        isOpen={true}
        onToggleOpen={vi.fn()}
        watchedSet={new Set()}
        planSet={new Set()}
        onToggleWatched={vi.fn()}
        onTogglePlan={vi.fn()}
        lectureNumbers={LECTURE_NUMBERS}
        isDailyLimitReached={false}
        todayRemainingCapSec={Infinity}
      />
    );
    expect(screen.getByText('Introduction to Java')).toBeInTheDocument();
    expect(screen.getByText('Variables and Types')).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /01.*Java Basics/i });
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    expect(consoleErrors).toHaveLength(0);
  });

  it('calls onToggleOpen when section header is clicked', async () => {
    const onToggleOpen = vi.fn();
    const user = userEvent.setup();
    render(
      <SectionCard
        section={MOCK_SECTION}
        isOpen={false}
        onToggleOpen={onToggleOpen}
        watchedSet={new Set()}
        planSet={new Set()}
        onToggleWatched={vi.fn()}
        onTogglePlan={vi.fn()}
        lectureNumbers={LECTURE_NUMBERS}
        isDailyLimitReached={false}
        todayRemainingCapSec={Infinity}
      />
    );
    await user.click(screen.getByRole('button', { name: /01.*Java Basics/i }));
    expect(onToggleOpen).toHaveBeenCalledOnce();
  });

  it('shows progress: 2/2 lectures when all watched', () => {
    render(
      <SectionCard
        section={MOCK_SECTION}
        isOpen={false}
        onToggleOpen={vi.fn()}
        watchedSet={new Set(['l1', 'l2'])}
        planSet={new Set()}
        onToggleWatched={vi.fn()}
        onTogglePlan={vi.fn()}
        lectureNumbers={LECTURE_NUMBERS}
        isDailyLimitReached={false}
        todayRemainingCapSec={Infinity}
      />
    );
    expect(screen.getByText(/2\/2/)).toBeInTheDocument();
    expect(consoleErrors).toHaveLength(0);
  });

  it('shows progress: 1/2 when one lecture watched', () => {
    render(
      <SectionCard
        section={MOCK_SECTION}
        isOpen={false}
        onToggleOpen={vi.fn()}
        watchedSet={new Set(['l1'])}
        planSet={new Set()}
        onToggleWatched={vi.fn()}
        onTogglePlan={vi.fn()}
        lectureNumbers={LECTURE_NUMBERS}
        isDailyLimitReached={false}
        todayRemainingCapSec={Infinity}
      />
    );
    expect(screen.getByText(/1\/2/)).toBeInTheDocument();
  });

  it('shows today dot when section has planned lectures', () => {
    render(
      <SectionCard
        section={MOCK_SECTION}
        isOpen={false}
        onToggleOpen={vi.fn()}
        watchedSet={new Set()}
        planSet={new Set(['l1'])} // l1 is in plan
        onToggleWatched={vi.fn()}
        onTogglePlan={vi.fn()}
        lectureNumbers={LECTURE_NUMBERS}
        isDailyLimitReached={false}
        todayRemainingCapSec={Infinity}
      />
    );
    // today dot has a title attribute
    const dot = document.querySelector('.today-dot');
    expect(dot).toBeInTheDocument();
    expect(consoleErrors).toHaveLength(0);
  });

  it('shows PROJECT pill for project sections', () => {
    const projectSection = { ...MOCK_SECTION, isProject: true };
    render(
      <SectionCard
        section={projectSection}
        isOpen={false}
        onToggleOpen={vi.fn()}
        watchedSet={new Set()}
        planSet={new Set()}
        onToggleWatched={vi.fn()}
        onTogglePlan={vi.fn()}
        lectureNumbers={LECTURE_NUMBERS}
        isDailyLimitReached={false}
        todayRemainingCapSec={Infinity}
      />
    );
    expect(screen.getByText('PROJECT')).toBeInTheDocument();
    expect(consoleErrors).toHaveLength(0);
  });

  it('renders an empty section (no lectures) without crashing', () => {
    const emptySection = { ...MOCK_SECTION, lectures: [] };
    render(
      <SectionCard
        section={emptySection}
        isOpen={true}
        onToggleOpen={vi.fn()}
        watchedSet={new Set()}
        planSet={new Set()}
        onToggleWatched={vi.fn()}
        onTogglePlan={vi.fn()}
        lectureNumbers={new Map()}
        isDailyLimitReached={false}
        todayRemainingCapSec={Infinity}
      />
    );
    expect(screen.getByText('Java Basics')).toBeInTheDocument();
    expect(consoleErrors).toHaveLength(0);
  });
});
