import { useEffect } from 'react';
import BadgeIcon from './BadgeIcon';
import './BadgesPanel.css';

export default function BadgeToast({ badge, onOpenBadges, onClose }) {
  useEffect(() => {
    if (!badge) return;
    const t = setTimeout(() => {
      onClose();
    }, 6000);
    return () => clearTimeout(t);
  }, [badge, onClose]);

  if (!badge) return null;

  return (
    <div className="badge-toast-container" role="status" aria-live="polite">
      <div
        className="badge-toast"
        onClick={() => {
          onOpenBadges();
          onClose();
        }}
      >
        <div className="badge-toast__icon">
          <BadgeIcon id={badge.id} isUnlocked={true} size={40} />
        </div>
        <div className="badge-toast__body">
          <div className="badge-toast__tag">
            <span>🎉 Achievement Unlocked</span>
          </div>
          <div className="badge-toast__title">{badge.title}</div>
        </div>
        <button
          className="badge-toast__btn"
          onClick={(e) => {
            e.stopPropagation();
            onOpenBadges();
            onClose();
          }}
        >
          View
        </button>
        <button
          className="badge-toast__close"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
