/**
 * Component Tests: Toolbar
 * Tests: render, search input, clear button, expand/collapse, clear plan.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toolbar from './Toolbar.jsx';

describe('Toolbar', () => {
  let consoleErrors;
  beforeEach(() => {
    consoleErrors = [];
    vi.spyOn(console, 'error').mockImplementation((...args) => consoleErrors.push(args));
  });

  it('renders without crashing with no query and no plan', () => {
    render(
      <Toolbar
        query=""
        onQueryChange={vi.fn()}
        onExpandAll={vi.fn()}
        onCollapseAll={vi.fn()}
        onClearPlan={vi.fn()}
        plannedCount={0}
      />
    );
    expect(screen.getByPlaceholderText('Search lectures…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expand all' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Collapse all' })).toBeInTheDocument();
    // Clear plan button should not be visible when plannedCount === 0
    expect(screen.queryByRole('button', { name: /clear today's plan/i })).not.toBeInTheDocument();
    expect(consoleErrors).toHaveLength(0);
  });

  it('shows clear plan button when plannedCount > 0', () => {
    render(
      <Toolbar
        query=""
        onQueryChange={vi.fn()}
        onExpandAll={vi.fn()}
        onCollapseAll={vi.fn()}
        onClearPlan={vi.fn()}
        plannedCount={5}
      />
    );
    expect(screen.getByRole('button', { name: /clear today's plan/i })).toBeInTheDocument();
  });

  it('calls onQueryChange when user types in search box', async () => {
    const onQueryChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Toolbar
        query=""
        onQueryChange={onQueryChange}
        onExpandAll={vi.fn()}
        onCollapseAll={vi.fn()}
        onClearPlan={vi.fn()}
        plannedCount={0}
      />
    );
    const input = screen.getByPlaceholderText('Search lectures…');
    await user.type(input, 'java');
    expect(onQueryChange).toHaveBeenCalled();
    expect(consoleErrors).toHaveLength(0);
  });

  it('shows clear (✕) button when query is non-empty', () => {
    render(
      <Toolbar
        query="java"
        onQueryChange={vi.fn()}
        onExpandAll={vi.fn()}
        onCollapseAll={vi.fn()}
        onClearPlan={vi.fn()}
        plannedCount={0}
      />
    );
    expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument();
  });

  it('does NOT show clear button when query is empty', () => {
    render(
      <Toolbar
        query=""
        onQueryChange={vi.fn()}
        onExpandAll={vi.fn()}
        onCollapseAll={vi.fn()}
        onClearPlan={vi.fn()}
        plannedCount={0}
      />
    );
    expect(screen.queryByRole('button', { name: /clear search/i })).not.toBeInTheDocument();
  });

  it('calls onQueryChange with empty string when clear button is clicked', async () => {
    const onQueryChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Toolbar
        query="java"
        onQueryChange={onQueryChange}
        onExpandAll={vi.fn()}
        onCollapseAll={vi.fn()}
        onClearPlan={vi.fn()}
        plannedCount={0}
      />
    );
    await user.click(screen.getByRole('button', { name: /clear search/i }));
    expect(onQueryChange).toHaveBeenCalledWith('');
  });

  it('calls onExpandAll when Expand all is clicked', async () => {
    const onExpandAll = vi.fn();
    const user = userEvent.setup();
    render(
      <Toolbar
        query=""
        onQueryChange={vi.fn()}
        onExpandAll={onExpandAll}
        onCollapseAll={vi.fn()}
        onClearPlan={vi.fn()}
        plannedCount={0}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Expand all' }));
    expect(onExpandAll).toHaveBeenCalledOnce();
  });

  it('calls onCollapseAll when Collapse all is clicked', async () => {
    const onCollapseAll = vi.fn();
    const user = userEvent.setup();
    render(
      <Toolbar
        query=""
        onQueryChange={vi.fn()}
        onExpandAll={vi.fn()}
        onCollapseAll={onCollapseAll}
        onClearPlan={vi.fn()}
        plannedCount={0}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Collapse all' }));
    expect(onCollapseAll).toHaveBeenCalledOnce();
  });

  it('calls onClearPlan when Clear today\'s plan is clicked', async () => {
    const onClearPlan = vi.fn();
    const user = userEvent.setup();
    render(
      <Toolbar
        query=""
        onQueryChange={vi.fn()}
        onExpandAll={vi.fn()}
        onCollapseAll={vi.fn()}
        onClearPlan={onClearPlan}
        plannedCount={3}
      />
    );
    await user.click(screen.getByRole('button', { name: /clear today's plan/i }));
    expect(onClearPlan).toHaveBeenCalledOnce();
  });
});
