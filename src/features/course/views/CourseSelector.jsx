import { useState, useRef, useEffect } from 'react';
import './CourseSelector.css';

/**
 * Custom course selector dropdown, replacing the native <select>.
 *
 * Props:
 *   courses        – array of { id, title, isDefault, lectureCount }
 *   activeCourseId – the currently selected course id
 *   onSwitch       – callback when a course is selected
 *   variant        – 'header' (compact, inline) or 'settings' (full-width, larger)
 */
export default function CourseSelector({ courses = [], activeCourseId, onSwitch, variant = 'settings' }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const activeCourse = courses.find((c) => c.id === activeCourseId) || courses[0];

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const handleSelect = (courseId) => {
    if (courseId !== activeCourseId && typeof onSwitch === 'function') {
      onSwitch(courseId);
    }
    setOpen(false);
  };

  const isHeader = variant === 'header';

  return (
    <div className={`cs-root ${isHeader ? 'cs-root--header' : 'cs-root--settings'}`} ref={containerRef}>
      <button
        className={`cs-trigger ${open ? 'cs-trigger--open' : ''}`}
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Switch active course"
      >
        <div className="cs-trigger__content">
          <span className="cs-trigger__title">{activeCourse?.title || 'Select course'}</span>
          {!isHeader && activeCourse?.isDefault && (
            <span className="cs-trigger__badge">built-in</span>
          )}
        </div>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className={`cs-dropdown ${isHeader ? 'cs-dropdown--header' : ''}`} role="listbox">
          <div className="cs-dropdown__label">Switch course</div>
          {courses.map((c) => {
            const isActive = c.id === activeCourseId;
            return (
              <button
                key={c.id}
                className={`cs-option ${isActive ? 'cs-option--active' : ''}`}
                onClick={() => handleSelect(c.id)}
                role="option"
                aria-selected={isActive}
              >
                <div className="cs-option__radio">
                  <div className={`cs-option__dot ${isActive ? 'cs-option__dot--on' : ''}`} />
                </div>
                <div className="cs-option__content">
                  <div className="cs-option__title">{c.title}</div>
                  <div className="cs-option__meta">
                    {c.lectureCount} lectures
                    {c.isDefault && <span className="cs-option__tag">BUILT-IN</span>}
                  </div>
                </div>
                {isActive && <CheckIcon />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg
      className={`cs-chevron ${open ? 'cs-chevron--open' : ''}`}
      width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="cs-check" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
