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

  it('renders modal with title, developer attribution, scope toggles, and multi-lecture selector when open', () => {
    render(
      <AiTutorModal
        open={true}
        onClose={vi.fn()}
        course={mockCourse}
      />
    );

    expect(screen.getByRole('dialog', { name: /ai tutor/i })).toBeInTheDocument();
    expect(screen.getByText(/sagar dhadke/i)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /topic \/ lecture/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /entire section/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /entire curriculum/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ask chatgpt/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ask claude/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy complete prompt/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download prompt \(\.md\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download prompt \(\.txt\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download xml structure/i })).toBeInTheDocument();
  });

  it('allows selecting multiple lectures via checkboxes and shows pills', async () => {
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

  it('supports section-level quick select/clear toggle', async () => {
    const user = userEvent.setup();
    render(
      <AiTutorModal
        open={true}
        onClose={vi.fn()}
        course={mockCourse}
      />
    );

    // Click "Select Sec" on section 1
    const sec1Btn = screen.getAllByRole('button', { name: /select sec|clear sec/i })[0];
    await user.click(sec1Btn);

    // Both lectures in section 1 should be selected
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

    await user.click(screen.getByRole('radio', { name: /entire section/i }));
    expect(screen.getByText(/section 01:/i)).toBeInTheDocument();
    expect(screen.getByText(/section 02:/i)).toBeInTheDocument();
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

  it('launches ChatGPT in new tab on button click and auto-copies prompt', async () => {
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

    expect(writeTextSpy).toHaveBeenCalled();
    expect(globalThis.open).toHaveBeenCalledWith(
      expect.stringContaining('https://chatgpt.com'),
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('launches Claude in new tab on button click and auto-copies prompt', async () => {
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

    expect(writeTextSpy).toHaveBeenCalled();
    expect(globalThis.open).toHaveBeenCalledWith(
      expect.stringContaining('https://claude.ai/new'),
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('copies full prompt to clipboard manually and shows status message', async () => {
    const user = userEvent.setup();
    render(
      <AiTutorModal
        open={true}
        onClose={vi.fn()}
        course={mockCourse}
      />
    );

    const copyBtn = screen.getByRole('button', { name: /copy complete prompt/i });
    await user.click(copyBtn);

    expect(writeTextSpy).toHaveBeenCalled();
    expect(screen.getByText(/complete prompt & course context copied/i)).toBeInTheDocument();
  });

  it('downloads context file (.md, .txt, and .xml)', async () => {
    const user = userEvent.setup();
    render(
      <AiTutorModal
        open={true}
        onClose={vi.fn()}
        course={mockCourse}
      />
    );

    const mdBtn = screen.getByRole('button', { name: /download prompt \(\.md\)/i });
    await user.click(mdBtn);
    expect(screen.getByText(/markdown \(\.md\) file .* downloaded/i)).toBeInTheDocument();

    const txtBtn = screen.getByRole('button', { name: /download prompt \(\.txt\)/i });
    await user.click(txtBtn);
    expect(screen.getByText(/text \(\.txt\) file .* downloaded/i)).toBeInTheDocument();

    const xmlBtn = screen.getByRole('button', { name: /download xml structure/i });
    await user.click(xmlBtn);
    expect(screen.getByText(/full course structure .* downloaded/i)).toBeInTheDocument();
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
