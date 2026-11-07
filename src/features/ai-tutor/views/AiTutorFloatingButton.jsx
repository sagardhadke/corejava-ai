import { useState } from 'react';
import { STORAGE_KEYS } from '../../../services/storage/keys.js';
import { showToast } from '../../../utils/toast.js';
import './AiTutorFloatingButton.css';

const AI_FAB_STORAGE_KEY = STORAGE_KEYS.AI_FAB_HIDDEN;

/**
 * Floating Action Button (FAB) for AI Tutor
 * Positioned cleanly above the developer attribution badge with zero collision.
 * Features an optional dismiss (✕) button so users can hide it if desired.
 */
export default function AiTutorFloatingButton({ onClick, badgeCount = 0 }) {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(AI_FAB_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const handleDismiss = (e) => {
    e.stopPropagation();
    try {
      localStorage.setItem(AI_FAB_STORAGE_KEY, 'true');
    } catch {
      // Ignore localStorage failure
    }
    setHidden(true);
    showToast('AI Tutor button hidden. You can still open it from the top toolbar or press Ctrl+K.', 'info', 3500);
  };

  if (hidden) return null;

  return (
    <aside className="ai-fab-container" aria-label="AI Tutor Floating Shortcut">
      <div className="ai-fab-group">
        <button
          type="button"
          className="ai-fab-btn"
          onClick={onClick}
          title="Ask AI Tutor (ChatGPT & Claude) about lectures or sections (Ctrl+K -> A)"
          aria-label={badgeCount > 0 ? `Ask AI Tutor (${badgeCount} selected)` : 'Ask AI Tutor'}
        >
          <span className="ai-fab-sparkle" aria-hidden="true">✨</span>
          <span className="ai-fab-label">Ask AI Tutor</span>
          {badgeCount > 0 && (
            <span className="ai-fab-badge" title={`${badgeCount} selected`}>
              {badgeCount}
            </span>
          )}
        </button>

        <button
          type="button"
          className="ai-fab-dismiss-btn"
          onClick={handleDismiss}
          title="Hide floating AI Tutor button"
          aria-label="Hide floating AI Tutor button"
        >
          ✕
        </button>
      </div>
    </aside>
  );
}
