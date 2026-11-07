import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AiTutorModal from './AiTutorModal.jsx';

const mockCourse = {
  id: 'test-course',
  title: 'Java Masterclass',
  sections: [
    {
      id: 's01',
      number: '01',
      title: 'Getting Started',
      lectures: [
        { id: 'l1', title: 'Installation Guide', durationLabel: '10m', durationSec: 600 },
        { id: 'l2', title: 'Hello World Deep Dive', durationLabel: '20m', durationSec: 1200 },
      ],
    },
    {
      id: 's02',
      number: '02',
      title: 'Advanced Streams',
      lectures: [
        { id: 'l3', title: 'Parallel Stream Internals', durationLabel: '35m', durationSec: 2100 },
      ],
    },
  ],
};

describe('AiTutorModal Component', () => {
  let writeTextSpy;

  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.open = vi.fn().mockReturnValue({ closed: false });

    // Mock clipboard.writeText via spy
    if (!navigator.clipboard) {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.resolve() },
        configurable: true,
      });
    }
    writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
  });

  it('renders modal with title, scope toggles, and multi-lecture selector when open', () => {
    render(
      <AiTutorModal
        open={true}
        onClose={vi.fn()}
        course={mockCourse}
      />
    );

    expect(screen.getByRole('dialog', { name: /ask ai tutor/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /by topic/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /by entire section/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /full curriculum/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ask chatgpt/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ask claude/i })).toBeInTheDocument();
  });

  it('allows selecting multiple lectures via checkboxes', async () => {
    const user = userEvent.setup();
    render(
      <AiTutorModal
        open={true}
        onClose={vi.fn()}
        course={mockCourse}
      />
    );

    // Initial first lecture is selected
    expect(screen.getByText(/selected \(1\):/i)).toBeInTheDocument();

    // Check the second lecture
    const secondCheckbox = screen.getAllByRole('checkbox')[1];
    await user.click(secondCheckbox);

    // Now 2 lectures should be selected
    expect(screen.getByText(/selected \(2\):/i)).toBeInTheDocument();
  });

  it('switches to section mode and renders section checkboxes', async () => {
    const user = userEvent.setup();
    render(
      <AiTutorModal
        open={true}
        onClose={vi.fn()}
        course={mockCourse}
      />
    );

    await user.click(screen.getByRole('radio', { name: /by entire section/i }));
    expect(screen.getByText(/section 01: getting started/i)).toBeInTheDocument();
    expect(screen.getByText(/section 02: advanced streams/i)).toBeInTheDocument();
  });

  it('toggles context optimization mode between focused and full', async () => {
    const user = userEvent.setup();
    render(
      <AiTutorModal
        open={true}
        onClose={vi.fn()}
        course={mockCourse}
      />
    );

    const fullModeBtn = screen.getByRole('radio', { name: /full syllabus/i });
    await user.click(fullModeBtn);
    expect(fullModeBtn).toHaveClass('ai-mode-btn--active');
  });

  it('launches ChatGPT in new tab on button click', async () => {
    const user = userEvent.setup();
    render(
      <AiTutorModal
        open={true}
        onClose={vi.fn()}
        course={mockCourse}
      />
    );

    const gptBtn = screen.getByRole('button', { name: /ask chatgpt/i });
    await user.click(gptBtn);

    expect(globalThis.open).toHaveBeenCalledWith(
      expect.stringContaining('https://chatgpt.com'),
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('launches Claude in new tab on button click', async () => {
    const user = userEvent.setup();
    render(
      <AiTutorModal
        open={true}
        onClose={vi.fn()}
        course={mockCourse}
      />
    );

    const claudeBtn = screen.getByRole('button', { name: /ask claude/i });
    await user.click(claudeBtn);

    expect(globalThis.open).toHaveBeenCalledWith(
      expect.stringContaining('https://claude.ai/new'),
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('copies full prompt to clipboard and shows success message', async () => {
    const user = userEvent.setup();
    render(
      <AiTutorModal
        open={true}
        onClose={vi.fn()}
        course={mockCourse}
      />
    );

    const copyBtn = screen.getByRole('button', { name: /copy formatted prompt/i });
    await user.click(copyBtn);

    expect(writeTextSpy).toHaveBeenCalled();
    expect(screen.getByText(/prompt copied to clipboard/i)).toBeInTheDocument();
  });

  it('downloads context file and displays the file guide', async () => {
    const user = userEvent.setup();
    render(
      <AiTutorModal
        open={true}
        onClose={vi.fn()}
        course={mockCourse}
      />
    );

    const downloadBtn = screen.getByRole('button', { name: /download context file \(\.md\)/i });
    await user.click(downloadBtn);

    expect(screen.getByText(/how to use the context file in chatgpt or claude/i)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <AiTutorModal
        open={true}
        onClose={handleClose}
        course={mockCourse}
      />
    );

    await user.click(screen.getByRole('button', { name: /close ai tutor dialog/i }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
