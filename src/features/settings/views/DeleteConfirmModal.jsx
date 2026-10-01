import { useState, useMemo } from 'react';
import './DeleteConfirmModal.css';

// Generates a 6-character alphanumeric code, excluding ambiguous characters
// (I/O/0/1) to avoid user confusion when typing.
function generateDeleteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/**
 * Reusable delete-confirmation modal.
 *
 * Props:
 *   open            – boolean, whether the modal is visible
 *   onClose         – called to dismiss without deleting
 *   onConfirm       – called when the user correctly enters the code
 *   title           – modal heading, e.g. "Delete course"
 *   warningMessage  – explanatory text shown above the code
 *   itemName        – optional, the name of the thing being deleted (shown in bold)
 */
export default function DeleteConfirmModal({ open, onClose, onConfirm, title, warningMessage, itemName }) {
  const [codeInput, setCodeInput] = useState('');
  const [error, setError] = useState('');
  const code = useMemo(() => generateDeleteCode(), [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const handleClose = () => {
    setCodeInput('');
    setError('');
    onClose();
  };

  const handleConfirm = () => {
    if (codeInput.trim().toUpperCase() !== code) {
      setError('That code doesn\'t match. Check the characters and try again.');
      return;
    }
    setCodeInput('');
    setError('');
    onConfirm();
  };

  const isCodeCorrect = codeInput.trim().toUpperCase() === code;

  const handleInputChange = (e) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setCodeInput(val);
    if (val.length === 6 && val !== code) {
      setError("Code doesn't match. Check the characters and try again.");
    } else {
      setError('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && isCodeCorrect) {
      handleConfirm();
    }
  };

  return (
    <div className="dcm-overlay" onClick={handleClose}>
      <div className="dcm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="dcm-modal__head">
          <h2>{title}</h2>
          <button className="dcm-modal__close" onClick={handleClose} aria-label="Close">✕</button>
        </div>

        <div className="dcm-modal__body">
          <div className="dcm-warning">
            <WarningIcon />
            <div>
              {itemName && <div className="dcm-warning__name">{itemName}</div>}
              <p className="dcm-warning__text">{warningMessage}</p>
            </div>
          </div>

          <p className="dcm-help">
            To confirm, type the code shown below exactly. This safeguard prevents accidental deletion.
          </p>

          <div className="dcm-code-display">
            {code.split('').map((ch, i) => (
              <span key={i} className="dcm-code-char">{ch}</span>
            ))}
          </div>

          <input
            type="text"
            maxLength={6}
            className="dcm-code-input"
            placeholder="Enter the 6-character code"
            value={codeInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            autoFocus
          />

          {error && <div className="dcm-error">{error}</div>}

          <div className="dcm-modal__actions">
            <button className="dcm-btn dcm-btn--ghost" onClick={handleClose}>Cancel</button>
            <button className="dcm-btn dcm-btn--danger" onClick={handleConfirm} disabled={!isCodeCorrect}>
              Confirm delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WarningIcon() {
  return (
    <svg className="dcm-warning__icon" width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
