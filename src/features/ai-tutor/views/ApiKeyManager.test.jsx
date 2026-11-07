import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ApiKeyManager from './ApiKeyManager.jsx';

describe('ApiKeyManager Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders header, privacy banner, and add key form', () => {
    render(<ApiKeyManager />);

    expect(screen.getByRole('heading', { name: /ai provider api keys/i })).toBeInTheDocument();
    expect(screen.getByText(/100% Private & Local/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/provider/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/api secret key/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ add key/i })).toBeInTheDocument();
  });

  it('adds an OpenAI key and displays it in the list with masking', async () => {
    const user = userEvent.setup();
    render(<ApiKeyManager />);

    const keyInput = screen.getByLabelText(/api secret key/i);
    await user.type(keyInput, 'sk-proj-test12345678901234567890');
    await user.click(screen.getByRole('button', { name: /\+ add key/i }));

    expect(screen.getByText(/key added successfully/i)).toBeInTheDocument();
    expect(screen.getByText(/sk-pro••••••••7890/i)).toBeInTheDocument();
    expect(screen.getByText('1 / 5 Keys')).toBeInTheDocument();
  });

  it('shows validation error for invalid key prefix', async () => {
    const user = userEvent.setup();
    render(<ApiKeyManager />);

    const keyInput = screen.getByLabelText(/api secret key/i);
    await user.type(keyInput, 'not-a-valid-key');
    await user.click(screen.getByRole('button', { name: /\+ add key/i }));

    expect(screen.getByText(/invalid key format/i)).toBeInTheDocument();
  });

  it('toggles help steps when how to get key is clicked', async () => {
    const user = userEvent.setup();
    render(<ApiKeyManager />);

    const helpBtn = screen.getByRole('button', { name: /how to get a openai key/i });
    expect(screen.queryByText(/sign in or sign up at https:\/\/platform\.openai\.com/i)).not.toBeInTheDocument();

    await user.click(helpBtn);
    expect(screen.getByText(/sign in or sign up at https:\/\/platform\.openai\.com/i)).toBeInTheDocument();
  });

  it('removes a key when remove button is clicked', async () => {
    const user = userEvent.setup();
    render(<ApiKeyManager />);

    const keyInput = screen.getByLabelText(/api secret key/i);
    await user.type(keyInput, 'sk-proj-test12345678901234567890');
    await user.click(screen.getByRole('button', { name: /\+ add key/i }));

    const deleteBtn = screen.getByRole('button', { name: /remove/i });
    await user.click(deleteBtn);

    expect(screen.getByText(/key removed from local storage/i)).toBeInTheDocument();
    expect(screen.getByText('0 / 5 Keys')).toBeInTheDocument();
  });
});

