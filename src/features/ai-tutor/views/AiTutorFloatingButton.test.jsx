import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AiTutorFloatingButton from './AiTutorFloatingButton.jsx';

describe('AiTutorFloatingButton Component', () => {
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
});

