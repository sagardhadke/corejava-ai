import { useRef, useState } from 'react';
import { previewCourseXml } from '../models/courseStoreModel.js';
import './CourseImportModal.css';

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Steps: 'upload' -> 'choose' (replace vs add) -> 'pin' (only if replace) -> done
export default function CourseImportModal({ open, onClose, onReplace, onAdd, activeCourseTitle }) {
  const fileInputRef = useRef(null);
  const [step, setStep] = useState('upload');
  const [parsedCourse, setParsedCourse] = useState(null);
  const [error, setError] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinCode] = useState(generateCode);

  if (!open) return null;

  const reset = () => {
    setStep('upload');
    setParsedCourse(null);
    setError('');
    setPinInput('');
    setPinError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileChosen = async (file) => {
    setError('');
    try {
      const text = await file.text();
      const course = previewCourseXml(text);
      setParsedCourse(course);
      setStep('choose');
    } catch (e) {
      setError(e.message || 'Could not parse this file.');
    }
  };

  const handlePickFile = () => fileInputRef.current?.click();

  const handleChooseAdd = () => {
    onAdd(parsedCourse);
    handleClose();
  };

  const handleChooseReplace = () => {
    setStep('pin');
  };

  const handleConfirmPin = () => {
    if (pinInput.trim() !== pinCode) {
      setPinError('That code doesn\'t match. Check the digits and try again.');
      return;
    }
    onReplace(parsedCourse);
    handleClose();
  };

  return (
    <div className="ci-overlay" onClick={handleClose}>
      <div className="ci-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Import course">
        <div className="ci-modal__head">
          <h2>Import a course</h2>
          <button className="ci-modal__close" onClick={handleClose} aria-label="Close">✕</button>
        </div>

        <div className="ci-modal__body">
          {step === 'upload' && (
            <>
              <p className="ci-help">
                Upload a course XML file in the same format as the built-in courses
                (a <code>&lt;course&gt;</code> root with <code>&lt;sections&gt;</code> and video <code>&lt;item&gt;</code> entries).
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xml,text/xml,application/xml"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileChosen(file);
                  e.target.value = '';
                }}
              />
              <button className="ci-dropzone" onClick={handlePickFile}>
                <UploadIcon />
                <span>Click to choose an XML file</span>
              </button>
              {error && <div className="ci-error">{error}</div>}
            </>
          )}

          {step === 'choose' && parsedCourse && (
            <>
              <div className="ci-preview">
                <div className="ci-preview__title">{parsedCourse.title}</div>
                <div className="ci-preview__meta">
                  {parsedCourse.sections.length} sections · {parsedCourse.allLectures.length} lectures
                </div>
              </div>
              <p className="ci-help">What would you like to do with this course?</p>
              <div className="ci-choice-list">
                <button className="ci-choice" onClick={handleChooseAdd}>
                  <div className="ci-choice__title">Add alongside current course</div>
                  <div className="ci-choice__desc">
                    Keep "{activeCourseTitle}" and its progress untouched. This new course becomes an
                    additional option you can switch to from the header.
                  </div>
                </button>
                <button className="ci-choice ci-choice--danger" onClick={handleChooseReplace}>
                  <div className="ci-choice__title">Replace current course</div>
                  <div className="ci-choice__desc">
                    Permanently removes "{activeCourseTitle}" and all of its watched/plan/streak
                    progress, replacing it with this new course. Requires confirmation.
                  </div>
                </button>
              </div>
            </>
          )}

          {step === 'pin' && (
            <>
              <p className="ci-help">
                This will permanently delete all progress for "{activeCourseTitle}". To confirm,
                type the code shown below exactly.
              </p>
              <div className="ci-code-display">
                {pinCode.split('').map((digit, i) => (
                  <span key={i} className="ci-code-digit">{digit}</span>
                ))}
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="ci-code-input"
                placeholder="Enter the 6-digit code"
                value={pinInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setPinInput(val);
                  if (val.length === 6 && val !== pinCode) {
                    setPinError("That code doesn't match. Check the digits and try again.");
                  } else {
                    setPinError('');
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && pinInput.trim() === pinCode) {
                    handleConfirmPin();
                  }
                }}
                autoFocus
              />
              {pinError && <div className="ci-error">{pinError}</div>}
              <div className="ci-modal__actions">
                <button className="ci-btn ci-btn--ghost" onClick={() => setStep('choose')}>Back</button>
                <button className="ci-btn ci-btn--danger" onClick={handleConfirmPin} disabled={pinInput.trim() !== pinCode}>
                  Replace course
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 16V4M12 4l-4 4M12 4l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
