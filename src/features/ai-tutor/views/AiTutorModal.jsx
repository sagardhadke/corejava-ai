import { useState, useMemo, useEffect, useRef } from 'react';
import { AI_PLATFORMS } from '../models/aiPlatforms.js';
import { preparePlatformUrl, buildFullPrompt, DEVELOPER_ATTRIBUTION } from '../models/promptBuilder.js';
import { copyToClipboard } from '../models/clipboard.js';
import { downloadCourseXml, downloadCourseContextFile } from '../models/courseXmlSerializer.js';
import { showToast } from '../../../utils/toast.js';
import './AiTutorModal.css';

/**
 * AiTutorModal — Senior Architecture
 *
 * Professional AI Tutor modal supporting:
 * - Topic-wise structured lecture checklist (section by section)
 * - Multi-section & Full curriculum modes
 * - Copy prompt, Download .md, Download .txt, and Download XML
 * - Developer & Platform attribution (Sagar Dhadke)
 * - ChatGPT & Claude external launcher with auto-clipboard copy
 * - Obsidian & Amber theme design system
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
  const [searchQuery, setSearchQuery] = useState('');
  const [openSections, setOpenSections] = useState({});
  const [contextMode, setContextMode] = useState('focused'); // 'focused' | 'full'
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const closeBtnRef = useRef(null);

  const sections = useMemo(() => course?.sections || [], [course]);

  // Flatten all lectures with section metadata
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
      return;
    }

    // Default open sections: expand first section or initial section
    const initOpen = {};
    if (initialSectionId) {
      initOpen[initialSectionId] = true;
    } else if (sections[0]) {
      initOpen[sections[0].id] = true;
    }
    setOpenSections(initOpen);

    // Initial scope determination
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
      setScopeType('multi-lecture');
      if (initialLectureId) {
        setSelectedLectureIds([initialLectureId]);
      } else if (allLectures[0]) {
        setSelectedLectureIds([allLectures[0].id]);
      }
      setSelectedSectionIds([]);
    }
  }, [open, initialScopeType, initialSectionId, initialLectureId, sections, allLectures]);

  // Keyboard navigation: Escape to dismiss
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Focus close button on open
  useEffect(() => {
    if (open) {
      closeBtnRef.current?.focus();
    }
  }, [open]);

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

  // Toggle lecture selection
  const handleToggleLecture = (lecId) => {
    setSelectedLectureIds((prev) => {
      if (prev.includes(lecId)) {
        return prev.filter((id) => id !== lecId);
      }
      return [...prev, lecId];
    });
  };

  // Toggle section accordion collapse
  const handleToggleSectionAccordion = (secId) => {
    setOpenSections((prev) => ({
      ...prev,
      [secId]: !prev[secId],
    }));
  };

  // Select all lectures in a specific section
  const handleSelectAllInSection = (sec) => {
    const lecIds = (sec.lectures || []).map((l) => l.id);
    setSelectedLectureIds((prev) => Array.from(new Set([...prev, ...lecIds])));
  };

  // Deselect all lectures in a specific section
  const handleDeselectSection = (sec) => {
    const lecIds = new Set((sec.lectures || []).map((l) => l.id));
    setSelectedLectureIds((prev) => prev.filter((id) => !lecIds.has(id)));
  };

  // Select all lectures across the entire course
  const handleSelectAllLectures = () => {
    setSelectedLectureIds(allLectures.map((l) => l.id));
  };

  // Clear all selected lectures
  const handleClearLectures = () => {
    setSelectedLectureIds([]);
  };

  // Toggle section in multi-section mode
  const handleToggleSectionSelect = (secId) => {
    setSelectedSectionIds((prev) => {
      if (prev.includes(secId)) {
        return prev.filter((id) => id !== secId);
      }
      return [...prev, secId];
    });
  };

  // Select all sections
  const handleSelectAllSections = () => {
    setSelectedSectionIds(sections.map((s) => s.id));
  };

  // Clear all sections
  const handleClearSections = () => {
    setSelectedSectionIds([]);
  };

  // Expand or collapse all sections in topic view
  const handleToggleExpandAll = () => {
    const allOpen = sections.every((s) => openSections[s.id]);
    const next = {};
    sections.forEach((s) => { next[s.id] = !allOpen; });
    setOpenSections(next);
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

  // Handle ChatGPT / Claude external platform launch with auto-copy
  const handleLaunchPlatform = async (platformId) => {
    const plan = platformId === 'claude' ? launchPlan.claude : launchPlan.chatgpt;
    if (!plan) return;

    setStatusMessage(null);

    // Auto-copy full prompt to clipboard
    const copyResult = await copyToClipboard(plan.fullPrompt);
    if (copyResult.success) {
      setStatusMessage({
        type: 'success',
        text: `✓ Full prompt & syllabus context copied to clipboard! Paste it with Ctrl/Cmd+V into ${plan.platformName}.`,
      });
      showToast(`Context copied! Paste into ${plan.platformName} with Ctrl+V`, 'success', 4000);
    } else {
      setStatusMessage({
        type: 'info',
        text: `Opening ${plan.platformName}. Click "Copy Complete Prompt" below to copy manually.`,
      });
    }

    // Open target platform in new tab
    window.open(plan.url, '_blank', 'noopener,noreferrer');
  };

  // Copy full prompt manually
  const handleCopyPrompt = async () => {
    const result = await copyToClipboard(launchPlan.fullPrompt);
    if (result.success) {
      setStatusMessage({
        type: 'success',
        text: '✓ Complete prompt & course context copied to clipboard! Ready to paste into ChatGPT or Claude.',
      });
      showToast('Prompt copied to clipboard!', 'success', 2500);
    } else {
      setStatusMessage({
        type: 'error',
        text: 'Clipboard access was blocked. Please select text in the preview below and copy manually.',
      });
    }
  };

  // Download context file (.md or .txt)
  const handleDownloadContext = (format = 'markdown') => {
    if (!course) return;
    const filename = downloadCourseContextFile(course, {
      selectedLectures,
      selectedSections,
      format,
    });
    const formatLabel = format === 'markdown' ? 'Markdown (.md)' : 'Text (.txt)';
    setStatusMessage({
      type: 'success',
      text: `✓ ${formatLabel} file "${filename}" downloaded! Drag & drop or attach it directly in ChatGPT or Claude.`,
    });
    showToast(`Downloaded ${filename}`, 'success', 3000);
  };

  // Download raw XML
  const handleDownloadXml = () => {
    if (!course) return;
    const filename = downloadCourseXml(course);
    setStatusMessage({
      type: 'success',
      text: `✓ Full course structure "${filename}" downloaded.`,
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
        {/* Header with Developer & Platform Info */}
        <div className="ai-modal__header">
          <div className="ai-modal__title-group">
            <span className="ai-modal__title-sparkle" aria-hidden="true">✨</span>
            <div>
              <h3 id="ai-modal-title" className="ai-modal__title">
                AI Tutor (ChatGPT &amp; Claude)
              </h3>
              <p id="ai-modal-subtitle" className="ai-modal__subtitle">
                Contextual AI tutor powered by your complete syllabus &middot; Crafted by{' '}
                <a
                  href={DEVELOPER_ATTRIBUTION.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ai-modal__dev-link"
                >
                  {DEVELOPER_ATTRIBUTION.name} ↗
                </a>
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

        {/* Modal Scrollable Body */}
        <div className="ai-modal__body">
          {/* Scope Type Selector */}
          <div className="ai-modal__section">
          <label className="ai-modal__label">1. Select Study Scope</label>
          <div className="ai-scope-selector" role="radiogroup" aria-label="Question Scope">
            <button
              type="button"
              className={`ai-scope-btn ${scopeType === 'multi-lecture' ? 'ai-scope-btn--active' : ''}`}
              onClick={() => setScopeType('multi-lecture')}
              role="radio"
              aria-checked={scopeType === 'multi-lecture'}
            >
              <span className="ai-scope-btn__icon">🎯</span>
              <span>Topic / Lecture (Topic-Wise)</span>
            </button>
            <button
              type="button"
              className={`ai-scope-btn ${scopeType === 'multi-section' ? 'ai-scope-btn--active' : ''}`}
              onClick={() => setScopeType('multi-section')}
              role="radio"
              aria-checked={scopeType === 'multi-section'}
            >
              <span className="ai-scope-btn__icon">📚</span>
              <span>Entire Section(s)</span>
            </button>
            <button
              type="button"
              className={`ai-scope-btn ${scopeType === 'full-course' ? 'ai-scope-btn--active' : ''}`}
              onClick={() => setScopeType('full-course')}
              role="radio"
              aria-checked={scopeType === 'full-course'}
            >
              <span className="ai-scope-btn__icon">🌐</span>
              <span>Entire Curriculum</span>
            </button>
          </div>
        </div>

        {/* Topic-Wise Lecture Checklist (Section by Section) */}
        <div className="ai-modal__section">
          {scopeType === 'multi-lecture' && (
            <div className="ai-topic-container">
              {/* Filter and Global Actions Bar */}
              <div className="ai-topic-toolbar">
                <input
                  type="text"
                  className="ai-topic-search"
                  placeholder="Filter topics by keyword (e.g. Streams, JVM, Threads)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Filter topics by keyword"
                />
                <div className="ai-topic-actions">
                  <button type="button" className="ai-text-btn" onClick={handleToggleExpandAll}>
                    Toggle Expand All
                  </button>
                  <button type="button" className="ai-text-btn" onClick={handleSelectAllLectures}>
                    Select All
                  </button>
                  <button type="button" className="ai-text-btn" onClick={handleClearLectures}>
                    Clear
                  </button>
                </div>
              </div>

              {/* Selected topic pills bar */}
              {selectedLectures.length > 0 && (
                <div className="ai-pills-bar">
                  <span className="ai-pills-label">
                    Selected ({selectedLectures.length}):
                  </span>
                  {selectedLectures.slice(0, 6).map((l) => (
                    <span key={l.id} className="ai-topic-pill">
                      {l.title}
                      <button
                        type="button"
                        className="ai-topic-pill__remove"
                        onClick={() => handleToggleLecture(l.id)}
                        aria-label={`Remove ${l.title}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {selectedLectures.length > 6 && (
                    <span className="ai-topic-pill ai-topic-pill--more">
                      +{selectedLectures.length - 6} more
                    </span>
                  )}
                </div>
              )}

              {/* Topic-wise Section Groups */}
              <div className="ai-topic-tree" role="group" aria-label="Course Topics">
                {sections.map((sec) => {
                  const lectures = sec.lectures || [];
                  const isSectionOpen = searchQuery ? true : !!openSections[sec.id];
                  const filteredLecs = searchQuery.trim()
                    ? lectures.filter((l) => l.title.toLowerCase().includes(searchQuery.toLowerCase()))
                    : lectures;

                  if (searchQuery.trim() && filteredLecs.length === 0) return null;

                  const secLecIds = new Set(lectures.map((l) => l.id));
                  const selectedInSec = selectedLectures.filter((l) => secLecIds.has(l.id)).length;
                  const allSecSelected = lectures.length > 0 && selectedInSec === lectures.length;

                  return (
                    <div key={sec.id} className="ai-sec-group">
                      <div className="ai-sec-group__head">
                        <button
                          type="button"
                          className="ai-sec-group__toggle"
                          onClick={() => handleToggleSectionAccordion(sec.id)}
                          aria-expanded={isSectionOpen}
                        >
                          <span className="ai-sec-chevron">{isSectionOpen ? '▼' : '▶'}</span>
                          <span className="ai-sec-num">Sec {sec.number}:</span>
                          <strong className="ai-sec-title">{sec.title}</strong>
                        </button>

                        <div className="ai-sec-group__actions">
                          <span className="ai-sec-count">
                            {selectedInSec}/{lectures.length}
                          </span>
                          <button
                            type="button"
                            className="ai-sec-btn"
                            onClick={() => (allSecSelected ? handleDeselectSection(sec) : handleSelectAllInSection(sec))}
                          >
                            {allSecSelected ? 'Clear Sec' : 'Select Sec'}
                          </button>
                        </div>
                      </div>

                      {isSectionOpen && (
                        <div className="ai-sec-group__body">
                          {filteredLecs.map((lec, idx) => {
                            const isChecked = selectedLectureIds.includes(lec.id);
                            return (
                              <label key={lec.id} className={`ai-lec-item ${isChecked ? 'ai-lec-item--checked' : ''}`}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleLecture(lec.id)}
                                  className="ai-lec-checkbox"
                                />
                                <span className="ai-lec-idx">#{idx + 1}</span>
                                <span className="ai-lec-title">{lec.title}</span>
                                <span className="ai-lec-dur">{lec.durationLabel || '15m'}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {scopeType === 'multi-section' && (
            <div className="ai-topic-container">
              <div className="ai-topic-toolbar">
                <span className="ai-topic-toolbar__title">
                  Select one or more sections ({selectedSections.length} of {sections.length} selected):
                </span>
                <div className="ai-topic-actions">
                  <button type="button" className="ai-text-btn" onClick={handleSelectAllSections}>
                    Select All
                  </button>
                  <button type="button" className="ai-text-btn" onClick={handleClearSections}>
                    Clear
                  </button>
                </div>
              </div>

              <div className="ai-section-checklist">
                {sections.map((sec) => {
                  const isChecked = selectedSectionIds.includes(sec.id);
                  return (
                    <label key={sec.id} className={`ai-lec-item ${isChecked ? 'ai-lec-item--checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSectionSelect(sec.id)}
                        className="ai-lec-checkbox"
                      />
                      <span className="ai-sec-num">Section {sec.number}:</span>
                      <strong className="ai-sec-title">{sec.title}</strong>
                      <span className="ai-lec-dur">({sec.lectures?.length || 0} lectures)</span>
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
                Sends the complete curriculum roadmap with all {sections.length} sections and {allLectures.length} lectures as comprehensive background context.
              </div>
            </div>
          )}
        </div>

        {/* Context Optimization Mode */}
        <div className="ai-modal__section">
          <div className="ai-context-header">
            <label className="ai-modal__label">2. Prompt Context Optimization</label>
            <div className="ai-mode-toggle" role="radiogroup" aria-label="Context Mode">
              <button
                type="button"
                className={`ai-mode-btn ${contextMode === 'focused' ? 'ai-mode-btn--active' : ''}`}
                onClick={() => setContextMode('focused')}
                role="radio"
                aria-checked={contextMode === 'focused'}
                title="Structured Markdown roadmap tailored to fit deep links cleanly"
              >
                ⚡ Focused (~1.5KB &middot; Fits Deep Links)
              </button>
              <button
                type="button"
                className={`ai-mode-btn ${contextMode === 'full' ? 'ai-mode-btn--active' : ''}`}
                onClick={() => setContextMode('full')}
                role="radio"
                aria-checked={contextMode === 'full'}
                title="Full course syllabus XML (Recommended for file download/attachment)"
              >
                📚 Full Syllabus (~15KB)
              </button>
            </div>
          </div>

          <div className="ai-length-badge">
            <span className="ai-length-dot" />
            <span>
              Prompt size: <strong>{launchPlan.promptLength.toLocaleString()} characters</strong>
              {contextMode === 'focused'
                ? ' — Optimized to fit directly inside ChatGPT & Claude URL links!'
                : ' — Exceeds URL limit; auto-copies to clipboard or download as .md file below.'}
            </span>
          </div>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div className={`ai-status-banner ai-status-banner--${statusMessage.type}`}>
            {statusMessage.text}
          </div>
        )}

        {/* Primary Action Buttons: Open ChatGPT / Claude */}
        <div className="ai-actions-grid">
          <button
            type="button"
            className="ai-btn-platform ai-btn-platform--chatgpt"
            onClick={() => handleLaunchPlatform('chatgpt')}
          >
            <span className="ai-platform-icon">💬</span>
            <div className="ai-platform-btn-text">
              <span className="ai-platform-btn-title">Ask ChatGPT</span>
              <span className="ai-platform-btn-sub">Copies prompt &amp; opens chatgpt.com</span>
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
              <span className="ai-platform-btn-sub">Copies prompt &amp; opens claude.ai</span>
            </div>
          </button>
        </div>

        {/* Dedicated File Download & Manual Copy Actions */}
        <div className="ai-aux-actions">
          <button
            type="button"
            className="ai-btn-aux ai-btn-aux--gold"
            onClick={handleCopyPrompt}
            title="Copy full formatted prompt to clipboard"
          >
            📋 Copy Complete Prompt
          </button>

          <button
            type="button"
            className="ai-btn-aux"
            onClick={() => handleDownloadContext('markdown')}
            title="Download ready-to-attach Markdown prompt file"
          >
            📥 Download Prompt (.md)
          </button>

          <button
            type="button"
            className="ai-btn-aux"
            onClick={() => handleDownloadContext('txt')}
            title="Download ready-to-attach Plain Text prompt file"
          >
            📥 Download Prompt (.txt)
          </button>

          <button
            type="button"
            className="ai-btn-aux"
            onClick={handleDownloadXml}
            title="Download complete course XML file"
          >
            📥 Download XML Structure
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
            <span>{previewExpanded ? '▼ Hide complete prompt text' : '▶ Preview complete prompt text...'}</span>
            <span className="ai-preview-tag">{launchPlan.promptLength} chars</span>
          </button>

          {previewExpanded && (
            <div className="ai-preview-content">
              <pre className="ai-preview-code">{launchPlan.fullPrompt}</pre>
            </div>
          )}
        </div>
      </div>

      {/* Footer Note */}
      <div className="ai-modal__footer-note">
          🔒 <strong>100% Free &amp; Client-Side:</strong> All curriculum context is processed offline in your browser. No server telemetry or data collection.
        </div>
      </div>
    </div>
  );
}
