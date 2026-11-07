import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App.jsx';

describe('App Overlays Characterization Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    window.scrollTo = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('opens and closes the Settings drawer via cog button and close button', async () => {
    render(<App />);

    // 1. Open Settings drawer via header button
    const settingsBtn = screen.getByLabelText('Open settings');
    fireEvent.click(settingsBtn);

    // Assert Settings panel is displayed
    expect(await screen.findByRole('heading', { level: 2, name: 'Settings' })).toBeInTheDocument();

    // 2. Close via close button
    const closeBtn = screen.getByLabelText('Close panel');
    fireEvent.click(closeBtn);
    await waitFor(() => {
      expect(screen.queryByRole('heading', { level: 2, name: 'Settings' })).not.toBeInTheDocument();
    });
  });

  it('closes the Settings drawer via Escape key', async () => {
    render(<App />);

    const settingsBtn = screen.getByLabelText('Open settings');
    fireEvent.click(settingsBtn);

    expect(await screen.findByRole('heading', { level: 2, name: 'Settings' })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('heading', { level: 2, name: 'Settings' })).not.toBeInTheDocument();
    });
  });

  it('opens and closes the Streak drawer via streak button and close button', async () => {
    render(<App />);

    const streakBtn = screen.getByTitle('Streak calendar');
    fireEvent.click(streakBtn);

    expect(await screen.findByRole('heading', { level: 2, name: 'Activity & Streak' })).toBeInTheDocument();

    const closeBtn = screen.getByLabelText('Close panel');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByRole('heading', { level: 2, name: 'Activity & Streak' })).not.toBeInTheDocument();
    });
  });

  it('opens and closes the Badges drawer via badges button and close button', async () => {
    render(<App />);

    const badgesBtn = screen.getByTitle(/achievements & badges/i);
    fireEvent.click(badgesBtn);

    expect(await screen.findByRole('heading', { level: 2, name: 'Achievements & Badges' })).toBeInTheDocument();

    const closeBtn = screen.getByLabelText('Close panel');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByRole('heading', { level: 2, name: 'Achievements & Badges' })).not.toBeInTheDocument();
    });
  });

  it('opens and closes the Notifications drawer via notif button and Escape key', async () => {
    render(<App />);

    const notifBtn = screen.getByRole('button', { name: /unread notifications|notifications/i });
    fireEvent.click(notifBtn);

    expect(await screen.findByRole('heading', { level: 2, name: 'Notification Center' })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('heading', { level: 2, name: 'Notification Center' })).not.toBeInTheDocument();
    });
  });

  it('opens and closes Command Palette via Ctrl+K and Escape key', async () => {
    render(<App />);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    expect(await screen.findByPlaceholderText(/type a command, section, or lecture title/i)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/type a command, section, or lecture title/i)).not.toBeInTheDocument();
    });
  });

  it('opens and closes Mobile Menu Drawer via hamburger button and Escape key', async () => {
    render(<App />);

    const menuBtn = screen.getByLabelText('Open mobile menu navigation');
    fireEvent.click(menuBtn);

    expect(await screen.findByRole('dialog', { name: 'Mobile Navigation' })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Mobile Navigation' })).not.toBeInTheDocument();
    });
  });

  it('opens and closes AI Tutor Modal via Toolbar button and Escape key', async () => {
    const { container } = render(<App />);

    const aiTutorBtn = container.querySelector('.tb-btn--ai');
    fireEvent.click(aiTutorBtn);

    expect(await screen.findByRole('dialog', { name: /ai tutor/i })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /ai tutor/i })).not.toBeInTheDocument();
    });
  });
});
