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

  it('renders modal with title, scope toggle, and selection dropdowns when open', () => {
    render(
      <AiTutorModal
        open={true}
        onClose={vi.fn()}
        course={mockCourse}
      />
    );

    expect(screen.getByRole('dialog', { name: /ask ai tutor/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /by topic/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /by entire section/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /select course section/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /select lecture topic/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ask chatgpt/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ask claude/i })).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    const { container } = render(
      <AiTutorModal
        open={false}
        onClose={vi.fn()}
        course={mockCourse}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('allows switching between Topic and Section scopes', async () => {
    const user = userEvent.setup();
    render(
      <AiTutorModal
        open={true}
        onClose={vi.fn()}
        course={mockCourse}
      />
    );

    // Initially in Topic mode
    expect(screen.getByRole('combobox', { name: /select lecture topic/i })).toBeInTheDocument();

    // Switch to Entire Section mode
    await user.click(screen.getByRole('button', { name: /by entire section/i }));

    // Topic dropdown should now be hidden
    expect(screen.queryByRole('combobox', { name: /select lecture topic/i })).not.toBeInTheDocument();
    expect(screen.getByText(/total lectures in section/i)).toBeInTheDocument();
  });

  it('updates lecture options when changing sections', async () => {
    const user = userEvent.setup();
    render(
      <AiTutorModal
        open={true}
        onClose={vi.fn()}
        course={mockCourse}
      />
    );

    // Switch section to s02
    const sectionSelect = screen.getByRole('combobox', { name: /select course section/i });
    await user.selectOptions(sectionSelect, 's02');

    // Lecture dropdown should now only show s02 lectures
    expect(screen.getByRole('option', { name: /parallel stream internals/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /installation guide/i })).not.toBeInTheDocument();
  });

  it('clicking Ask ChatGPT auto-copies full prompt and opens ChatGPT in a new tab', async () => {
    const user = userEvent.setup();
    render(
      <AiTutorModal
        open={true}
        onClose={vi.fn()}
        course={mockCourse}
      />
    );

    const chatGptBtn = screen.getByRole('button', { name: /ask chatgpt/i });
    await user.click(chatGptBtn);

    // Clipboard writeText should have been called with full prompt (including XML)
    expect(writeTextSpy).toHaveBeenCalledWith(
      expect.stringContaining('You are an expert AI tutor for the course "Java Masterclass"')
    );
    expect(writeTextSpy).toHaveBeenCalledWith(
      expect.stringContaining('```xml')
    );

    // Window.open should have been called with chatgpt URL and noopener,noreferrer
    expect(globalThis.open).toHaveBeenCalledWith(
      expect.stringContaining('https://chatgpt.com/?q='),
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('clicking Ask Claude opens Claude in a new tab and copies context', async () => {
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
      expect.stringContaining('https://claude.ai/new?q='),
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('manual copy prompt button copies prompt to clipboard', async () => {
    const user = userEvent.setup();
    render(
      <AiTutorModal
        open={true}
        onClose={vi.fn()}
        course={mockCourse}
      />
    );

    const copyBtn = screen.getByRole('button', { name: /copy full prompt/i });
    await user.click(copyBtn);

    expect(writeTextSpy).toHaveBeenCalledWith(
      expect.stringContaining('You are an expert AI tutor')
    );
  });

  it('toggles prompt preview when clicking preview button', async () => {
    const user = userEvent.setup();
    render(
      <AiTutorModal
        open={true}
        onClose={vi.fn()}
        course={mockCourse}
      />
    );

    expect(screen.queryByLabelText(/generated prompt preview/i)).not.toBeInTheDocument();

    const previewToggle = screen.getByRole('button', { name: /preview full prompt/i });
    await user.click(previewToggle);

    expect(screen.getByLabelText(/generated prompt preview/i)).toBeInTheDocument();
  });

  it('closes when pressing Escape key or clicking close button', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(
      <AiTutorModal
        open={true}
        onClose={handleClose}
        course={mockCourse}
      />
    );

    // Close button
    const closeBtn = screen.getByRole('button', { name: /close ai tutor dialog/i });
    await user.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Escape key
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});
