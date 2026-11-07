import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AiTutorFloatingButton from './AiTutorFloatingButton.jsx';

describe('AiTutorFloatingButton Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders floating action button with accessible name', () => {
    render(<AiTutorFloatingButton onClick={vi.fn()} />);

    const btn = screen.getByRole('button', { name: /open ai tutor dialog/i });
    expect(btn).toBeInTheDocument();
    expect(screen.getByText('Ask AI Tutor')).toBeInTheDocument();
  });

  it('renders badge count when count > 0', () => {
    render(<AiTutorFloatingButton onClick={vi.fn()} badgeCount={3} />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('triggers onClick handler when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<AiTutorFloatingButton onClick={handleClick} />);

    const btn = screen.getByRole('button', { name: /open ai tutor dialog/i });
    await user.click(btn);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('hides button and saves to localStorage when dismiss (✕) is clicked', async () => {
    const user = userEvent.setup();
    render(<AiTutorFloatingButton onClick={vi.fn()} />);

    const dismissBtn = screen.getByRole('button', { name: /hide floating ai tutor button/i });
    await user.click(dismissBtn);

    expect(localStorage.getItem('jct_ai_fab_hidden')).toBe('true');
    expect(screen.queryByRole('button', { name: /open ai tutor dialog/i })).not.toBeInTheDocument();
  });

  it('does not render if previously dismissed in localStorage', () => {
    localStorage.setItem('jct_ai_fab_hidden', 'true');
    render(<AiTutorFloatingButton onClick={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /open ai tutor dialog/i })).not.toBeInTheDocument();
  });
});
