import { useState, useMemo, useEffect, useRef } from 'react';
import { AI_PLATFORMS } from '../models/aiPlatforms.js';
import { preparePlatformUrl, buildFullPrompt } from '../models/promptBuilder.js';
import { copyToClipboard } from '../models/clipboard.js';
import { downloadCourseXml, downloadCourseContextFile } from '../models/courseXmlSerializer.js';
import { showToast } from '../../../utils/toast.js';
import './AiTutorModal.css';

/**
 * AiTutorModal
 *
 * Professional AI Tutor dialog supporting:
 * - Multi-lecture selection across sections
 * - Multi-section selection
 * - Full course syllabus context
 * - Targeted/focused context (fits deep-link URLs) vs. full context
 * - One-click Context File download (.md / .xml) for easy chat attachment
 * - Deep linking to ChatGPT & Claude with hybrid clipboard fallback
 */
export default function AiTutorModal({
  open,
  onClose,
  course,
  initialScopeType = 'multi-lecture',
  initialSectionId = null,
  initialLectureId = null,
}) {
  const [scopeType, setScopeType] = useState('multi-lecture');
  const [selectedLectureIds, setSelectedLectureIds] = useState([]);
  const [selectedSectionIds, setSelectedSectionIds] = useState([]);
  const [filterSectionId, setFilterSectionId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMode, setContextMode] = useState('focused'); // 'focused' | 'full'
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [showFileGuide, setShowFileGuide] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const closeBtnRef = useRef(null);

  const sections = useMemo(() => course?.sections || [], [course]);

  // Flatten all lectures with section metadata for search/filtering
  const allLectures = useMemo(() => {
    const list = [];
    sections.forEach((sec) => {
      (sec.lectures || []).forEach((lec) => {
        list.push({
          ...lec,
          sectionId: sec.id,
          sectionNumber: sec.number,
          sectionTitle: sec.title,
        });
      });
    });
    return list;
  }, [sections]);

  // Synchronize state when opened
  useEffect(() => {
    if (!open) {
      setStatusMessage(null);
      setPreviewExpanded(false);
      setShowFileGuide(false);
      return;
    }

    // Determine initial scope
    if (initialScopeType === 'section' || initialScopeType === 'multi-section') {
      setScopeType('multi-section');
      const secId = initialSectionId || sections[0]?.id;
      setSelectedSectionIds(secId ? [secId] : []);
      setSelectedLectureIds([]);
    } else if (initialScopeType === 'full-course') {
      setScopeType('full-course');
      setSelectedLectureIds([]);
      setSelectedSectionIds([]);
    } else {
      // multi-lecture / topic
      setScopeType('multi-lecture');
      if (initialLectureId) {
        setSelectedLectureIds([initialLectureId]);
      } else if (allLectures[0]) {
        setSelectedLectureIds([allLectures[0].id]);
      }
      setSelectedSectionIds([]);
    }

    if (initialSectionId) {
      setFilterSectionId(initialSectionId);
    } else {
      setFilterSectionId('all');
    }
  }, [open, initialScopeType, initialSectionId, initialLectureId, sections, allLectures]);

  // Focus close button when modal opens
  useEffect(() => {
    if (open) {
      closeBtnRef.current?.focus();
    }
  }, [open]);

  // Handle escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Selected lecture objects
  const selectedLectures = useMemo(() => {
    const idSet = new Set(selectedLectureIds);
    return allLectures.filter((l) => idSet.has(l.id));
  }, [allLectures, selectedLectureIds]);

  // Selected section objects
  const selectedSections = useMemo(() => {
    const idSet = new Set(selectedSectionIds);
    return sections.filter((s) => idSet.has(s.id));
  }, [sections, selectedSectionIds]);

  // Filtered lectures for checklist
  const displayLectures = useMemo(() => {
    return allLectures.filter((l) => {
      if (filterSectionId !== 'all' && l.sectionId !== filterSectionId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return l.title.toLowerCase().includes(q) || (l.sectionTitle && l.sectionTitle.toLowerCase().includes(q));
      }
      return true;
    });
  }, [allLectures, filterSectionId, searchQuery]);

  // Toggle lecture selection
  const handleToggleLecture = (lecId) => {
    setSelectedLectureIds((prev) => {
      if (prev.includes(lecId)) {
        return prev.filter((id) => id !== lecId);
      }
      return [...prev, lecId];
    });
  };

  // Toggle section selection
  const handleToggleSection = (secId) => {
    setSelectedSectionIds((prev) => {
      if (prev.includes(secId)) {
        return prev.filter((id) => id !== secId);
      }
      return [...prev, secId];
    });
  };

  // Select all lectures in active filtered view
  const handleSelectAllFilteredLectures = () => {
    const visibleIds = displayLectures.map((l) => l.id);
    setSelectedLectureIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  // Clear lecture selections
  const handleClearLectures = () => {
    setSelectedLectureIds([]);
  };

  // Select all sections
  const handleSelectAllSections = () => {
    setSelectedSectionIds(sections.map((s) => s.id));
  };

  // Clear section selections
  const handleClearSections = () => {
    setSelectedSectionIds([]);
  };

  // Prepared launch configurations
  const launchPlan = useMemo(() => {
    if (!course) return { chatgpt: null, claude: null, fullPrompt: '', promptLength: 0 };

    const effectiveScope = scopeType === 'multi-lecture' ? 'multi-lecture'
      : scopeType === 'multi-section' ? 'multi-section'
      : 'full-course';

    const fullPrompt = buildFullPrompt({
      course,
      scopeType: effectiveScope,
      selectedLectures,
      selectedSections,
      contextMode,
    });

    const chatgpt = preparePlatformUrl({
      platform: AI_PLATFORMS.chatgpt,
      course,
      scopeType: effectiveScope,
      selectedLectures,
      selectedSections,
      contextMode,
    });

    const claude = preparePlatformUrl({
      platform: AI_PLATFORMS.claude,
      course,
      scopeType: effectiveScope,
      selectedLectures,
      selectedSections,
      contextMode,
    });

    return {
      chatgpt,
      claude,
      fullPrompt,
      promptLength: fullPrompt.length,
    };
  }, [course, scopeType, selectedLectures, selectedSections, contextMode]);

  // Handle external platform launch
  const handleLaunchPlatform = async (platformId) => {
    const plan = platformId === 'claude' ? launchPlan.claude : launchPlan.chatgpt;
    if (!plan) return;

    setStatusMessage(null);

    // If over threshold, write full prompt to clipboard
    if (plan.isOverThreshold) {
      const copyResult = await copyToClipboard(plan.fullPrompt);
      if (copyResult.success) {
        setStatusMessage({
          type: 'success',
          text: `Full prompt & context copied to clipboard! Paste it with Ctrl/Cmd+V into ${plan.platformName}.`,
        });
        showToast(`Full context copied! Paste into ${plan.platformName} with Ctrl+V`, 'success', 4000);
      } else {
        setStatusMessage({
          type: 'warning',
          text: `Could not auto-copy to clipboard. Please click "Copy Full Prompt" below before continuing.`,
        });
      }
    } else {
      setStatusMessage({
        type: 'info',
        text: `Opening ${plan.platformName} with complete prompt prefilled!`,
      });
    }

    // Open target in new tab synchronously
    window.open(plan.url, '_blank', 'noopener,noreferrer');
  };

  // Manual copy full prompt
  const handleCopyPrompt = async () => {
    const result = await copyToClipboard(launchPlan.fullPrompt);
    if (result.success) {
      setStatusMessage({
        type: 'success',
        text: '✓ Prompt copied to clipboard! Ready to paste into ChatGPT or Claude.',
      });
      showToast('Prompt copied to clipboard!', 'success', 2500);
    } else {
      setStatusMessage({
        type: 'error',
        text: 'Clipboard copy failed. Please select text in the preview and copy manually.',
      });
    }
  };

  // Download context file (.md)
  const handleDownloadContext = (format = 'markdown') => {
    if (!course) return;
    const filename = downloadCourseContextFile(course, {
      selectedLectures,
      selectedSections,
      format,
    });
    setStatusMessage({
      type: 'success',
      text: `✓ Context file "${filename}" downloaded! Drag & drop or attach it in ChatGPT / Claude.`,
    });
    setShowFileGuide(true);
    showToast(`Downloaded ${filename}`, 'success', 3000);
  };

  // Download XML file
  const handleDownloadXml = () => {
    if (!course) return;
    const filename = downloadCourseXml(course);
    setStatusMessage({
      type: 'success',
      text: `✓ Course structure "${filename}" downloaded.`,
    });
    showToast(`Downloaded ${filename}`, 'success', 3000);
  };

  if (!open) return null;

  return (
    <div
      className="ai-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        className="ai-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-modal-title"
        aria-describedby="ai-modal-subtitle"
      >
        {/* Header */}
        <div className="ai-modal__header">
          <div className="ai-modal__title-group">
            <span className="ai-modal__title-icon" aria-hidden="true">✨</span>
            <div>
              <h3 id="ai-modal-title" className="ai-modal__title">
                Ask AI Tutor (ChatGPT &amp; Claude)
              </h3>
              <p id="ai-modal-subtitle" className="ai-modal__subtitle">
                Contextual tutor powered by your complete course syllabus
              </p>
            </div>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="ai-modal__close-btn"
            onClick={onClose}
            aria-label="Close AI Tutor dialog"
          >
            ✕
          </button>
        </div>

        {/* Scope Type Selector */}
        <div className="ai-modal__section">
          <label className="ai-modal__label">1. Choose Question Scope</label>
          <div className="ai-scope-selector" role="radiogroup" aria-label="Question Scope">
            <button
              type="button"
              className={`ai-scope-btn ${scopeType === 'multi-lecture' ? 'ai-scope-btn--active' : ''}`}
              onClick={() => setScopeType('multi-lecture')}
              role="radio"
              aria-checked={scopeType === 'multi-lecture'}
            >
              <span className="ai-scope-btn__icon">🎯</span>
              <span>By Topic / Lecture</span>
            </button>
            <button
              type="button"
              className={`ai-scope-btn ${scopeType === 'multi-section' ? 'ai-scope-btn--active' : ''}`}
              onClick={() => setScopeType('multi-section')}
              role="radio"
              aria-checked={scopeType === 'multi-section'}
            >
              <span className="ai-scope-btn__icon">📚</span>
              <span>By Entire Section</span>
            </button>
            <button
              type="button"
              className={`ai-scope-btn ${scopeType === 'full-course' ? 'ai-scope-btn--active' : ''}`}
              onClick={() => setScopeType('full-course')}
              role="radio"
              aria-checked={scopeType === 'full-course'}
            >
              <span className="ai-scope-btn__icon">🌐</span>
              <span>Full Curriculum</span>
            </button>
          </div>
        </div>

        {/* Scope Selection Controls */}
        <div className="ai-modal__section">
          {scopeType === 'multi-lecture' && (
            <div className="ai-multi-box">
              <div className="ai-multi-box__header">
                <div className="ai-multi-box__filters">
                  <select
                    className="ai-select ai-select--filter"
                    value={filterSectionId}
                    onChange={(e) => setFilterSectionId(e.target.value)}
                    aria-label="Filter lectures by section"
                  >
                    <option value="all">All Sections ({sections.length})</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        Sec {s.number}: {s.title} ({s.lectures?.length || 0})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    className="ai-search-input"
                    placeholder="Search lectures..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search lectures"
                  />
                </div>
                <div className="ai-multi-box__actions">
                  <button
                    type="button"
                    className="ai-link-btn"
                    onClick={handleSelectAllFilteredLectures}
                  >
                    Select All Shown
                  </button>
                  <button
                    type="button"
                    className="ai-link-btn"
                    onClick={handleClearLectures}
                  >
                    Clear Selection
                  </button>
                </div>
              </div>

              {/* Selected lecture pills */}
              {selectedLectures.length > 0 && (
                <div className="ai-selected-pills">
                  <span className="ai-selected-count">
                    Selected ({selectedLectures.length}):
                  </span>
                  {selectedLectures.slice(0, 5).map((l) => (
                    <span key={l.id} className="ai-pill">
                      {l.title}
                      <button
                        type="button"
                        className="ai-pill__remove"
                        onClick={() => handleToggleLecture(l.id)}
                        aria-label={`Remove ${l.title}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {selectedLectures.length > 5 && (
                    <span className="ai-pill ai-pill--more">
                      +{selectedLectures.length - 5} more
                    </span>
                  )}
                </div>
              )}

              {/* Lecture Checklist */}
              <div className="ai-checklist" role="group" aria-label="Available lectures">
                {displayLectures.map((lec) => {
                  const isChecked = selectedLectureIds.includes(lec.id);
                  return (
                    <label key={lec.id} className={`ai-check-item ${isChecked ? 'ai-check-item--checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleLecture(lec.id)}
                        className="ai-check-input"
                      />
                      <div className="ai-check-info">
                        <span className="ai-check-title">{lec.title}</span>
                        <span className="ai-check-meta">
                          Sec {lec.sectionNumber} · {lec.durationLabel || '15m'}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {scopeType === 'multi-section' && (
            <div className="ai-multi-box">
              <div className="ai-multi-box__header">
                <span className="ai-multi-box__subtitle">
                  Select one or more sections ({selectedSections.length} of {sections.length} selected):
                </span>
                <div className="ai-multi-box__actions">
                  <button type="button" className="ai-link-btn" onClick={handleSelectAllSections}>
                    Select All
                  </button>
                  <button type="button" className="ai-link-btn" onClick={handleClearSections}>
                    Clear
                  </button>
                </div>
              </div>

              <div className="ai-checklist" role="group" aria-label="Available sections">
                {sections.map((sec) => {
                  const isChecked = selectedSectionIds.includes(sec.id);
                  return (
                    <label key={sec.id} className={`ai-check-item ${isChecked ? 'ai-check-item--checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSection(sec.id)}
                        className="ai-check-input"
                      />
                      <div className="ai-check-info">
                        <span className="ai-check-title">
                          Section {sec.number}: {sec.title}
                        </span>
                        <span className="ai-check-meta">
                          {sec.lectures?.length || 0} lectures · {sec.isProject ? 'Project' : 'Theory & Practice'}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {scopeType === 'full-course' && (
            <div className="ai-summary-card">
              <div className="ai-summary-card__title">
                🌐 Entire Curriculum Context: &ldquo;{course?.title || 'Core Java with AI'}&rdquo;
              </div>
              <div className="ai-summary-card__details">
                Includes all {sections.length} sections and {allLectures.length} lectures as comprehensive background context for the AI.
              </div>
            </div>
          )}
        </div>

        {/* Context Mode Toggle (Focused vs Full) */}
        <div className="ai-modal__section">
          <div className="ai-context-header">
            <label className="ai-modal__label">2. Context Optimization Mode</label>
            <div className="ai-mode-toggle" role="radiogroup" aria-label="Context Mode">
              <button
                type="button"
                className={`ai-mode-btn ${contextMode === 'focused' ? 'ai-mode-btn--active' : ''}`}
                onClick={() => setContextMode('focused')}
                role="radio"
                aria-checked={contextMode === 'focused'}
                title="Concise outline tailored to fit deep links cleanly"
              >
                ⚡ Focused (~1.5KB &middot; Fits Deep Links)
              </button>
              <button
                type="button"
                className={`ai-mode-btn ${contextMode === 'full' ? 'ai-mode-btn--active' : ''}`}
                onClick={() => setContextMode('full')}
                role="radio"
                aria-checked={contextMode === 'full'}
                title="Full course syllabus XML (Recommended for file attachment)"
              >
                📚 Full Syllabus (~15KB)
              </button>
            </div>
          </div>

          <div className="ai-length-badge">
            <span className="ai-length-dot" />
            <span>
              Prompt size: <strong>{launchPlan.promptLength.toLocaleString()} chars</strong>
              {contextMode === 'focused'
                ? ' — Fits directly in ChatGPT & Claude query parameters!'
                : ' — Exceeds URL limit; auto-copies to clipboard or use file attachment.'}
            </span>
          </div>
        </div>

        {/* Action Status Notification */}
        {statusMessage && (
          <div className={`ai-status-banner ai-status-banner--${statusMessage.type}`}>
            {statusMessage.text}
          </div>
        )}

        {/* File Attachment Guide (when opened or downloaded) */}
        {showFileGuide && (
          <div className="ai-file-guide">
            <div className="ai-file-guide__title">
              💡 How to use the Context File in ChatGPT or Claude:
            </div>
            <ol className="ai-file-guide__steps">
              <li>Open your chat platform (<button type="button" className="ai-link-inline" onClick={() => handleLaunchPlatform('chatgpt')}>ChatGPT</button> or <button type="button" className="ai-link-inline" onClick={() => handleLaunchPlatform('claude')}>Claude</button>).</li>
              <li>Click the paperclip 📎 (or drag &amp; drop) the downloaded <code>.md</code> file into the prompt box.</li>
              <li>Ask your question! The AI will have full curriculum context without character limits.</li>
            </ol>
          </div>
        )}

        {/* Primary Launch Action Buttons */}
        <div className="ai-actions-grid">
          <button
            type="button"
            className="ai-btn-platform ai-btn-platform--chatgpt"
            onClick={() => handleLaunchPlatform('chatgpt')}
          >
            <span className="ai-platform-icon">💬</span>
            <div className="ai-platform-btn-text">
              <span className="ai-platform-btn-title">Ask ChatGPT</span>
              <span className="ai-platform-btn-sub">Open chatgpt.com</span>
            </div>
          </button>

          <button
            type="button"
            className="ai-btn-platform ai-btn-platform--claude"
            onClick={() => handleLaunchPlatform('claude')}
          >
            <span className="ai-platform-icon">⚡</span>
            <div className="ai-platform-btn-text">
              <span className="ai-platform-btn-title">Ask Claude</span>
              <span className="ai-platform-btn-sub">Open claude.ai</span>
            </div>
          </button>
        </div>

        {/* Auxiliary Actions: File Download & Clipboard */}
        <div className="ai-aux-actions">
          <button
            type="button"
            className="ai-btn-aux ai-btn-aux--primary"
            onClick={() => handleDownloadContext('markdown')}
            title="Download formatted Markdown syllabus to drag and drop into chat"
          >
            📎 Download Context File (.md)
          </button>

          <button
            type="button"
            className="ai-btn-aux"
            onClick={handleCopyPrompt}
            title="Copy full formatted prompt to clipboard"
          >
            📋 Copy Formatted Prompt
          </button>

          <button
            type="button"
            className="ai-btn-aux"
            onClick={handleDownloadXml}
            title="Download complete course XML file"
          >
            📥 Download XML
          </button>
        </div>

        {/* Collapsible Prompt Preview */}
        <div className="ai-preview-section">
          <button
            type="button"
            className="ai-preview-toggle"
            onClick={() => setPreviewExpanded((v) => !v)}
            aria-expanded={previewExpanded}
          >
            <span>{previewExpanded ? '▼ Hide prompt text' : '▶ Preview prompt text...'}</span>
            <span className="ai-preview-tag">{launchPlan.promptLength} chars</span>
          </button>

          {previewExpanded && (
            <div className="ai-preview-content">
              <pre className="ai-preview-code">{launchPlan.fullPrompt}</pre>
            </div>
          )}
        </div>

        {/* Privacy & Logged-In Hint */}
        <div className="ai-modal__footer-note">
          🔒 <strong>100% Client-Side Privacy:</strong> Your course data never touches an external server. Ensure you are signed in to ChatGPT or Claude in your browser.
        </div>
      </div>
    </div>
  );
}
