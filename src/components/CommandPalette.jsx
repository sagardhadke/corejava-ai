import { useState, useEffect, useRef, useMemo } from 'react';
import { exportAllData } from '../data/courseStore.js';
import { showToast } from '../utils/toast.js';
import './CommandPalette.css';

/**
 * Enterprise Command Palette (Ctrl+K / Cmd+K)
 * Lightning-fast search across lectures, syllabus sections, courses, and system actions.
 */
export default function CommandPalette({
  open,
  onClose,
  course,
  courses = [],
  onSwitchCourse,
  onJumpToSection,
  onOpenCalendar,
  onOpenBadges,
  onOpenSettings,
  onOpenPracticeModal,
  onOpenImport,
  onClearPlan,
}) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQuery('');
      setActiveIndex(0);
    }
  }

  // Focus input when opened
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Compute command palette items
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = [];

    // 1. App actions
    const actions = [
      {
        id: 'action-badges',
        category: 'Quick Actions',
        title: 'View Achievements & Badges',
        shortcut: 'B',
        icon: '🏆',
        run: () => { onClose(); onOpenBadges?.(); },
      },
      {
        id: 'action-calendar',
        category: 'Quick Actions',
        title: 'View Streak & Activity Heat-Map',
        shortcut: 'C',
        icon: '🔥',
        run: () => { onClose(); onOpenCalendar?.(); },
      },
      {
        id: 'action-settings',
        category: 'Quick Actions',
        title: 'Open Settings & Target Pacing',
        shortcut: 'S',
        icon: '⚙️',
        run: () => { onClose(); onOpenSettings?.(); },
      },
      {
        id: 'action-practice',
        category: 'Quick Actions',
        title: 'Mark Today as Practice Day',
        shortcut: 'P',
        icon: '💻',
        run: () => { onClose(); onOpenPracticeModal?.(); },
      },
      {
        id: 'action-import',
        category: 'Quick Actions',
        title: 'Import Course from XML',
        icon: '📤',
        run: () => { onClose(); onOpenImport?.(); },
      },
      {
        id: 'action-backup',
        category: 'Quick Actions',
        title: 'Download Complete JSON Backup',
        icon: '💾',
        run: () => {
          onClose();
          const backup = exportAllData();
          const json = JSON.stringify(backup, null, 2);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `course-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showToast('Backup downloaded successfully.', 'success');
        },
      },
      {
        id: 'action-clear-plan',
        category: 'Quick Actions',
        title: "Clear Today's Plan",
        icon: '✕',
        run: () => { onClose(); onClearPlan?.(); showToast("Today's plan cleared.", 'info'); },
      },
    ];

    actions.forEach((a) => {
      if (!q || a.title.toLowerCase().includes(q)) {
        result.push(a);
      }
    });

    // 2. Course switching
    if (courses.length > 1) {
      courses.forEach((c) => {
        if (!q || c.title.toLowerCase().includes(q) || 'switch course'.includes(q)) {
          result.push({
            id: `course-${c.id}`,
            category: 'Courses',
            title: `Switch to: ${c.title}`,
            sub: `${c.lectureCount} lectures ${c.isDefault ? '· Built-in' : ''}`,
            icon: '📚',
            run: () => {
              onClose();
              onSwitchCourse?.(c.id);
              showToast(`Switched to ${c.title}`, 'info');
            },
          });
        }
      });
    }

    // 3. Sections in active course
    if (course?.sections) {
      course.sections.forEach((s) => {
        if (!q || s.title.toLowerCase().includes(q) || `section ${s.number}`.includes(q)) {
          result.push({
            id: `sec-${s.id}`,
            category: 'Sections',
            title: `${s.number}. ${s.title}`,
            sub: `${s.lectures.length} lectures`,
            icon: '📁',
            run: () => {
              onClose();
              onJumpToSection?.(s.id);
            },
          });
        }
      });
    }

    // 4. Lectures in active course
    if (course?.allLectures && q) {
      let lectureCount = 0;
      course.allLectures.forEach((l, idx) => {
        if (lectureCount >= 15) return; // Limit to top 15 matches to keep palette swift
        if (l.title.toLowerCase().includes(q) || `lecture ${idx + 1}`.includes(q)) {
          lectureCount++;
          result.push({
            id: `lec-${l.id}`,
            category: 'Lectures',
            title: `${idx + 1}. ${l.title}`,
            sub: `${l.durationLabel || ''} · ${l.sectionTitle || ''}`,
            icon: '▶',
            run: () => {
              onClose();
              if (l.sectionId) onJumpToSection?.(l.sectionId);
            },
          });
        }
      });
    }

    return result;
  }, [query, course, courses, onClose, onOpenBadges, onOpenCalendar, onOpenSettings, onOpenPracticeModal, onOpenImport, onClearPlan, onSwitchCourse, onJumpToSection]);

  // Keyboard navigation inside palette
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (items.length ? (prev + 1) % items.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (items.length ? (prev - 1 + items.length) % items.length : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[activeIndex]) {
          items[activeIndex].run();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, items, activeIndex, onClose]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('.cp-item--active');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  if (!open) return null;

  return (
    <div className="cp-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Command Palette">
      <div className="cp-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="cp-header">
          <span className="cp-search-icon" aria-hidden="true">
            <SearchIcon />
          </span>
          <input
            ref={inputRef}
            type="text"
            className="cp-input"
            placeholder="Type a command, section, or lecture title…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            spellCheck={false}
          />
          <kbd className="cp-esc-badge" onClick={onClose}>ESC</kbd>
        </div>

        <div className="cp-body" ref={listRef}>
          {items.length === 0 ? (
            <div className="cp-empty">
              <span>No matching commands or lectures found for "{query}".</span>
            </div>
          ) : (
            items.map((item, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <div
                  key={item.id}
                  className={`cp-item ${isSelected ? 'cp-item--active' : ''}`}
                  onClick={() => item.run()}
                  onMouseEnter={() => setActiveIndex(idx)}
                >
                  <span className="cp-item__icon" aria-hidden="true">{item.icon}</span>
                  <div className="cp-item__text">
                    <span className="cp-item__title">{item.title}</span>
                    {item.sub && <span className="cp-item__sub">{item.sub}</span>}
                  </div>
                  <span className="cp-item__category">{item.category}</span>
                  {item.shortcut && <kbd className="cp-item__kbd">{item.shortcut}</kbd>}
                </div>
              );
            })
          )}
        </div>

        <div className="cp-footer">
          <div className="cp-footer__hint">
            <kbd>↑</kbd><kbd>↓</kbd> navigate
          </div>
          <div className="cp-footer__hint">
            <kbd>↵</kbd> select
          </div>
          <div className="cp-footer__hint">
            <kbd>esc</kbd> close
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
