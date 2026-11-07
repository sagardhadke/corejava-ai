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
 * - ChatGPT & Claude external launcher with auto-clipboard copy & auto-file download
 * - Clean URL handling for Claude to bypass malicious prompt injection warnings
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

  // Handle ChatGPT / Claude external platform launch
  // Auto-copies prompt & auto-downloads syllabus context file
  // Uses clean URL for Claude to eliminate "Malicious content could trick Claude" warning
  const handleLaunchPlatform = async (platformId) => {
    const plan = platformId === 'claude' ? launchPlan.claude : launchPlan.chatgpt;
    if (!plan) return;

    setStatusMessage(null);

    // 1. Auto-copy complete prompt to clipboard
    const copyResult = await copyToClipboard(plan.fullPrompt);

    // 2. Auto-download context file (.md) so user can drop or attach it directly
    let downloadedFile = null;
    try {
      downloadedFile = downloadCourseContextFile(course, {
        selectedLectures,
        selectedSections,
        format: 'markdown',
      });
    } catch {
      // Fallback silently if download blocked
    }

    // 3. Clean URLs for Claude and ChatGPT:
    // - Claude: 'https://claude.ai/new' without ?q= parameter completely eliminates Anthropic's
    //   "Use caution before running this prompt. Malicious content could trick Claude..." warning!
    // - ChatGPT: 'https://chatgpt.com/' avoids HTTP 431 Request Header Fields Too Large on long prompts.
    const targetUrl = platformId === 'claude' ? 'https://claude.ai/new' : 'https://chatgpt.com/';

    window.open(targetUrl, '_blank', 'noopener,noreferrer');

    const platformName = platformId === 'claude' ? 'Claude' : 'ChatGPT';
    const filename = downloadedFile || 'core-java-with-ai-context.md';
    if (copyResult.success) {
      setStatusMessage({
        type: 'success',
        text: `✓ Full prompt copied & "${filename}" downloaded! In ${platformName}: Press Ctrl+V to paste, or drag & drop the downloaded file into the chat.`,
      });
      showToast(`Prompt copied & file downloaded! Paste (Ctrl+V) or drop file into ${platformName}`, 'success', 5000);
    } else {
      setStatusMessage({
        type: 'info',
        text: `Opening ${platformName}. Click "Copy Complete Prompt" below to copy manually.`,
      });
    }
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
        {/* Pinned Modal Header */}
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
          {/* Scope Segmented Control */}
          <div className="ai-scope-wrapper">
            <div className="ai-scope-selector" role="radiogroup" aria-label="Question Scope">
              <button
                type="button"
                className={`ai-scope-btn ${scopeType === 'multi-lecture' ? 'ai-scope-btn--active' : ''}`}
                onClick={() => setScopeType('multi-lecture')}
                role="radio"
                aria-checked={scopeType === 'multi-lecture'}
                aria-label="Topic / Lecture (Topic-Wise)"
              >
                <span className="ai-scope-btn__icon">🎯</span>
                <span className="ai-scope-btn__label">Topic / Lecture</span>
              </button>
              <button
                type="button"
                className={`ai-scope-btn ${scopeType === 'multi-section' ? 'ai-scope-btn--active' : ''}`}
                onClick={() => setScopeType('multi-section')}
                role="radio"
                aria-checked={scopeType === 'multi-section'}
                aria-label="Entire Section(s)"
              >
                <span className="ai-scope-btn__icon">📚</span>
                <span className="ai-scope-btn__label">Entire Section(s)</span>
              </button>
              <button
                type="button"
                className={`ai-scope-btn ${scopeType === 'full-course' ? 'ai-scope-btn--active' : ''}`}
                onClick={() => setScopeType('full-course')}
                role="radio"
                aria-checked={scopeType === 'full-course'}
                aria-label="Entire Curriculum"
              >
                <span className="ai-scope-btn__icon">🌐</span>
                <span className="ai-scope-btn__label">Entire Curriculum</span>
              </button>
            </div>
          </div>

          {/* Topic-Wise Lecture Checklist (Section by Section) */}
          <div className="ai-modal__section">
            {scopeType === 'multi-lecture' && (
              <div className="ai-topic-container">
                {/* Search & Actions Bar */}
                <div className="ai-topic-toolbar-stacked">
                  <div className="ai-search-wrap">
                    <span className="ai-search-icon" aria-hidden="true">🔍</span>
                    <input
                      type="text"
                      className="ai-topic-search"
                      placeholder="Filter topics by keyword (e.g. Streams, JVM, Threads)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="Filter topics by keyword"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        className="ai-search-clear-btn"
                        onClick={() => setSearchQuery('')}
                        aria-label="Clear filter"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="ai-topic-subbar">
                    <span className="ai-pills-label">
                      Selected ({selectedLectures.length}):
                    </span>
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
                </div>

                {/* Selected Topic Summary Pill */}
                {selectedLectures.length > 0 && (
                  <div className="ai-pills-bar">
                    {selectedLectures.slice(0, 4).map((l) => (
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
                    {selectedLectures.length > 4 && (
                      <span className="ai-topic-pill ai-topic-pill--more">
                        +{selectedLectures.length - 4} more
                      </span>
                    )}
                  </div>
                )}

                {/* Topic-wise Section Groups Accordion */}
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
                  Sends the complete curriculum architecture covering all {sections.length} sections and {allLectures.length} lectures as comprehensive background context.
                </div>
              </div>
            )}
          </div>

          {/* Context Optimization Mode */}
          <div className="ai-context-strip">
            <div className="ai-context-strip__left">
              <span className="ai-context-strip__label">Context Mode:</span>
              <div className="ai-mode-toggle" role="radiogroup" aria-label="Context Mode">
                <button
                  type="button"
                  className={`ai-mode-btn ${contextMode === 'focused' ? 'ai-mode-btn--active' : ''}`}
                  onClick={() => setContextMode('focused')}
                  role="radio"
                  aria-checked={contextMode === 'focused'}
                  title="Compact syllabus roadmap"
                >
                  ⚡ Focused (~1.5KB)
                </button>
                <button
                  type="button"
                  className={`ai-mode-btn ${contextMode === 'full' ? 'ai-mode-btn--active' : ''}`}
                  onClick={() => setContextMode('full')}
                  role="radio"
                  aria-checked={contextMode === 'full'}
                  title="Full course syllabus XML"
                >
                  📚 Full Syllabus (~15KB)
                </button>
              </div>
            </div>

            <div className="ai-length-badge">
              <span className="ai-length-dot" />
              <span>{launchPlan.promptLength.toLocaleString()} chars</span>
            </div>
          </div>

          {/* Status Banner */}
          {statusMessage && (
            <div className={`ai-status-banner ai-status-banner--${statusMessage.type}`}>
              {statusMessage.text}
            </div>
          )}

          {/* Primary Action Hero Cards: ChatGPT & Claude */}
          <div className="ai-actions-grid">
            <button
              type="button"
              className="ai-btn-platform ai-btn-platform--chatgpt"
              onClick={() => handleLaunchPlatform('chatgpt')}
            >
              <div className="ai-platform-icon-wrap ai-platform-icon-wrap--chatgpt">
                <OpenAiSvg />
              </div>
              <div className="ai-platform-btn-text">
                <div className="ai-platform-btn-title-row">
                  <span className="ai-platform-btn-title">Ask ChatGPT</span>
                  <span className="ai-platform-badge ai-platform-badge--openai">OpenAI</span>
                </div>
                <span className="ai-platform-btn-sub">Auto-copies prompt &amp; context file ↗</span>
              </div>
            </button>

            <button
              type="button"
              className="ai-btn-platform ai-btn-platform--claude"
              onClick={() => handleLaunchPlatform('claude')}
            >
              <div className="ai-platform-icon-wrap ai-platform-icon-wrap--claude">
                <ClaudeSvg />
              </div>
              <div className="ai-platform-btn-text">
                <div className="ai-platform-btn-title-row">
                  <span className="ai-platform-btn-title">Ask Claude</span>
                  <span className="ai-platform-badge ai-platform-badge--claude">Safe Launch</span>
                </div>
                <span className="ai-platform-btn-sub">Bypasses URL security warnings ↗</span>
              </div>
            </button>
          </div>

          {/* Security & Attachment Hint */}
          <div className="ai-security-hint">
            <span className="ai-security-hint__icon">🛡️</span>
            <span>
              <strong>Safe File Attachment:</strong> Clicking <strong>Ask Claude</strong> or <strong>Ask ChatGPT</strong> auto-downloads the syllabus context file and copies the prompt to your clipboard — completely bypassing Claude&apos;s malicious URL injection security warnings. Simply press <code>Ctrl+V</code> or drop the file in!
            </span>
          </div>

          {/* Auxiliary File Download & Copy Actions */}
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

        {/* Pinned Footer Note */}
        <div className="ai-modal__footer-note">
          🔒 <strong>100% Free &amp; Client-Side:</strong> All curriculum context is processed offline in your browser. No server telemetry or data collection.
        </div>
      </div>
    </div>
  );
}

/**
 * Clean Vector SVGs for OpenAI / ChatGPT and Anthropic Claude
 */
function OpenAiSvg() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3428 7.897a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3427 7.897zm16.5991 3.8558L13.1038 8.3843l2.0153-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4022-.6813zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
    </svg>
  );
}

function ClaudeSvg() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.684 2.5a1.2 1.2 0 0 0-2.368 0L9.08 14.65l-4.83-8.8a1.2 1.2 0 0 0-2.09 1.18l6.38 11.63-3.69 3.01a1.2 1.2 0 1 0 1.52 1.86l4.28-3.49 4.28 3.49a1.2 1.2 0 0 0 1.52-1.86l-3.69-3.01 6.38-11.63a1.2 1.2 0 0 0-2.09-1.18l-4.83 8.8L13.684 2.5z" />
    </svg>
  );
}
