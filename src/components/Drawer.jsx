import { useEffect } from 'react';
import './Drawer.css';

export default function Drawer({ open, onClose, title, children, side = 'right' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside
        className={`drawer drawer--${side}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="drawer__head">
          <h2>{title}</h2>
          <button className="drawer__close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="drawer__body">{children}</div>
      </aside>
    </div>
  );
}
