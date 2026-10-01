import { useMemo, useState } from 'react';
import { dateKey } from '../../../utils/time.js';
import './PracticeDayModal.css';

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default function PracticeDayModal({ open, onClose, onConfirm, targetDate, startDate }) {
  const [step, setStep] = useState('note');
  const [note, setNote] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [error, setError] = useState('');
  const [code] = useState(generateCode);

  const wordCount = useMemo(() => countWords(note), [note]);
  const noteValid = wordCount >= 10;

  if (!open) return null;

  const targetDateKey = targetDate ? dateKey(targetDate) : dateKey();
  const isBeforeStart = !!(startDate && targetDateKey < startDate);

  const dateLabel = targetDate
    ? targetDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'today';

  const handleClose = () => {
    setStep('note');
    setNote('');
    setCodeInput('');
    setError('');
    onClose();
  };

  const handleContinue = () => {
    if (isBeforeStart) {
      setError(`Cannot mark practice day before the course start date (${startDate}).`);
      return;
    }
    if (!noteValid) {
      setError(`Write at least 10 words about what you practiced (currently ${wordCount}).`);
      return;
    }
    setError('');
    setStep('code');
  };

  const handleConfirm = () => {
    if (codeInput.trim() !== code) {
      setError('That code doesn\'t match. Check the digits and try again.');
      return;
    }
    onConfirm(note.trim());
    handleClose();
  };

  return (
    <div className="pd-overlay" onClick={handleClose}>
      <div className="pd-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Mark practice day">
        <div className="pd-modal__head">
          <h2>Mark {dateLabel} as a practice day</h2>
          <button className="pd-modal__close" onClick={handleClose} aria-label="Close">✕</button>
        </div>

        {step === 'note' ? (
          <div className="pd-modal__body">
            <p className="pd-modal__help">
              No lecture that day, but you still practiced — coding problems, revision, typing drills, whatever it was.
              Describe it in at least 10 words so it actually counts as effort, not a free pass.
            </p>
            <textarea
              className="pd-textarea"
              rows={4}
              placeholder="e.g. Solved 5 array pattern problems and revised operators from lecture 2 for interview prep"
              value={note}
              onChange={(e) => { setNote(e.target.value); setError(''); }}
              autoFocus
            />
            <div className="pd-word-count">
              <span className={noteValid ? 'pd-word-count--ok' : ''}>{wordCount} / 10 words</span>
            </div>
            {error && <div className="pd-error">{error}</div>}
            <div className="pd-modal__actions">
              <button className="pd-btn pd-btn--ghost" onClick={handleClose}>Cancel</button>
              <button className="pd-btn pd-btn--primary" onClick={handleContinue} disabled={!noteValid}>Continue</button>
            </div>
          </div>
        ) : (
          <div className="pd-modal__body">
            <p className="pd-modal__help">
              To confirm, type this code exactly. This last step is just to make sure you mean it —
              a practice day should be the exception, not the daily default.
            </p>
            <div className="pd-code-display">
              {code.split('').map((digit, i) => (
                <span key={i} className="pd-code-digit">{digit}</span>
              ))}
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              className="pd-code-input"
              placeholder="Enter the 6-digit code"
              value={codeInput}
              onChange={(e) => { setCodeInput(e.target.value.replace(/\D/g, '')); setError(''); }}
              autoFocus
            />
            {error && <div className="pd-error">{error}</div>}
            <div className="pd-modal__actions">
              <button className="pd-btn pd-btn--ghost" onClick={() => setStep('note')}>Back</button>
              <button className="pd-btn pd-btn--primary" onClick={handleConfirm} disabled={codeInput.length !== 6}>
                Confirm practice day
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
