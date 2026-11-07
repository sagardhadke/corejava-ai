import './AiTutorFloatingButton.css';

/**
 * Floating Action Button (FAB) for the AI Tutor
 * Positioned fixed at bottom-right corner of viewport.
 * Elevates cleanly above the mobile navigation bar when on mobile devices.
 */
export default function AiTutorFloatingButton({ onClick, badgeCount = 0 }) {
  return (
    <aside className="ai-fab-container" aria-label="AI Tutor Floating Shortcut">
      <button
        type="button"
        className="ai-fab-btn"
        onClick={onClick}
        title="Ask AI Tutor (ChatGPT & Claude) about lectures or sections (Ctrl+K -> A)"
        aria-label="Open AI Tutor dialog to ask questions about selected lectures or sections"
      >
        <span className="ai-fab-sparkle" aria-hidden="true">✨</span>
        <span className="ai-fab-label">Ask AI Tutor</span>
        {badgeCount > 0 && (
          <span className="ai-fab-badge" title={`${badgeCount} selected`}>
            {badgeCount}
          </span>
        )}
      </button>
    </aside>
  );
}

