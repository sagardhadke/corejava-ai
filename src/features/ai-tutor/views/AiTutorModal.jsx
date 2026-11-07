import { useState, useMemo, useEffect, useRef } from 'react';
import { AI_PLATFORMS } from '../models/aiPlatforms.js';
import { preparePlatformUrl, buildFullPrompt } from '../models/promptBuilder.js';
import { copyToClipboard } from '../models/clipboard.js';
import { downloadCourseXml } from '../models/courseXmlSerializer.js';
import { showToast } from '../../../utils/toast.js';
import './AiTutorModal.css';

/**
 * AiTutorModal
 *
 * Provides a streamlined dialog allowing students to select a single lecture
 * or full section and launch directly into ChatGPT or Claude with complete
 * course curriculum XML context.
 */
export default function AiTutorModal({
  open,
  onClose,
  course,
  initialScopeType = 'topic',
  initialSectionId = null,
  initialLectureId = null,
}) {
  const [scopeType, setScopeType] = useState(initialScopeType);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [selectedLectureId, setSelectedLectureId] = useState(null);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const closeBtnRef = useRef(null);

  const sections = useMemo(() => course?.sections || [], [course]);

  // Synchronize selection state when opening or when initial props change
  useEffect(() => {
    if (!open) {
      setStatusMessage(null);
      setPreviewExpanded(false);
      return;
    }

    setScopeType(initialScopeType || 'topic');

    const defaultSecId = initialSectionId || sections[0]?.id || null;
    setSelectedSectionId(defaultSecId);

    const activeSec = sections.find((s) => s.id === defaultSecId) || sections[0];
    const defaultLecId = initialLectureId || activeSec?.lectures?.[0]?.id || null;
    setSelectedLectureId(defaultLecId);
  }, [open, initialScopeType, initialSectionId, initialLectureId, sections]);

  // Update selected lecture if the user switches to a different section
  const handleSectionChange = (secId) => {
    setSelectedSectionId(secId);
    const sec = sections.find((s) => s.id === secId);
    if (sec?.lectures?.length) {
      setSelectedLectureId(sec.lectures[0].id);
    } else {
      setSelectedLectureId(null);
    }
  };

  const currentSection = useMemo(() => {
    return sections.find((s) => s.id === selectedSectionId) || sections[0] || null;
  }, [sections, selectedSectionId]);

  const currentLecture = useMemo(() => {
    if (!currentSection?.lectures) return null;
    return currentSection.lectures.find((l) => l.id === selectedLectureId) || currentSection.lectures[0] || null;
  }, [currentSection, selectedLectureId]);

  // Prepared launch configurations for ChatGPT and Claude
  const chatGptPlan = useMemo(() => {
    if (!course) return null;
    return preparePlatformUrl({
      platform: AI_PLATFORMS.chatgpt,
      course,
      scopeType,
      section: currentSection,
      lecture: currentLecture,
    });
  }, [course, scopeType, currentSection, currentLecture]);

  const claudePlan = useMemo(() => {
    if (!course) return null;
    return preparePlatformUrl({
      platform: AI_PLATFORMS.claude,
      course,
      scopeType,
      section: currentSection,
      lecture: currentLecture,
    });
  }, [course, scopeType, currentSection, currentLecture]);

  const fullPromptText = useMemo(() => {
    if (!course) return '';
    return buildFullPrompt({
      course,
      scopeType,
      section: currentSection,
      lecture: currentLecture,
    });
  }, [course, scopeType, currentSection, currentLecture]);

  // Handle keyboard Escape to dismiss modal
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !course) return null;

  /**
   * Launch selected AI platform directly inside click turn
   */
  const handleLaunch = async (platformId) => {
    const plan = platformId === 'claude' ? claudePlan : chatGptPlan;
    if (!plan) return;

    // If over the threshold, auto-copy full prompt to clipboard
    if (plan.isOverThreshold) {
      const copyResult = await copyToClipboard(plan.fullPrompt);
      if (copyResult.success) {
        const msg = `Full course context copied! Paste into ${plan.platformName} with Ctrl+V (⌘V).`;
        setStatusMessage({ type: 'success', text: msg });
        showToast(msg, 'success', 5000);
      } else {
        const warn = `Could not auto-copy to clipboard. Please copy prompt preview manually or download XML.`;
        setStatusMessage({ type: 'warning', text: warn });
        showToast(warn, 'warning', 6000);
      }
    } else {
      setStatusMessage({
        type: 'success',
        text: `Opening ${plan.platformName} with full course prompt...`,
      });
    }

    // Call window.open inside the click handler turn
    try {
      const openedWindow = window.open(plan.url, '_blank', 'noopener,noreferrer');
      if (!openedWindow || openedWindow.closed || typeof openedWindow.closed === 'undefined') {
        // Popup might have been blocked
        setStatusMessage({
          type: 'warning',
          text: `Pop-up was blocked by browser. Please allow popups or use the direct link below.`,
        });
      }
    } catch {
      setStatusMessage({
        type: 'error',
        text: `Failed to open ${plan.platformName} tab. Please copy the prompt manually.`,
      });
    }
  };

  /**
   * Manually copy the full prompt text to clipboard
   */
  const handleManualCopy = async () => {
    const res = await copyToClipboard(fullPromptText);
    if (res.success) {
      showToast('Full course prompt copied to clipboard!', 'success', 3500);
      setStatusMessage({
        type: 'success',
        text: 'Full course prompt copied to clipboard! You can paste it directly into any AI platform.',
      });
    } else {
      showToast('Failed to copy to clipboard.', 'error');
    }
  };

  /**
   * Download complete course structure XML
   */
  const handleDownloadXml = () => {
    try {
      const filename = downloadCourseXml(course);
      showToast(`Downloaded ${filename}`, 'info', 3500);
    } catch {
      showToast('Error downloading course XML.', 'error');
    }
  };

  const isOverThreshold = chatGptPlan?.isOverThreshold || claudePlan?.isOverThreshold;

  return (
    <div
      className="ai-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        className="ai-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-tutor-modal-title"
      >
        {/* Header */}
        <div className="ai-modal__head">
          <div className="ai-modal__title-wrap">
            <span className="ai-modal__sparkle" aria-hidden="true">✨</span>
            <div>
              <h2 id="ai-tutor-modal-title" className="ai-modal__title">
                Ask AI Tutor (ChatGPT & Claude)
              </h2>
              <p className="ai-modal__subtitle">
                Contextual tutor powered by your complete course syllabus
              </p>
            </div>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="ai-modal__close"
            onClick={onClose}
            aria-label="Close AI Tutor dialog"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="ai-modal__body">
          {/* Status Message Banner if present */}
          {statusMessage && (
            <div
              className={`ai-status-banner ai-status-banner--${statusMessage.type}`}
              role="alert"
            >
              <span>{statusMessage.type === 'success' ? '✓' : '⚠️'}</span>
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Scope Selector: Topic vs Section */}
          <div className="ai-scope-toggle" role="group" aria-label="Study Scope Selection">
            <button
              type="button"
              className={`ai-scope-btn ${scopeType === 'topic' ? 'ai-scope-btn--active' : ''}`}
              onClick={() => setScopeType('topic')}
              aria-pressed={scopeType === 'topic'}
            >
              <span>🎯</span> By Topic (Lecture)
            </button>
            <button
              type="button"
              className={`ai-scope-btn ${scopeType === 'section' ? 'ai-scope-btn--active' : ''}`}
              onClick={() => setScopeType('section')}
              aria-pressed={scopeType === 'section'}
            >
              <span>📚</span> By Entire Section
            </button>
          </div>

          {/* Section Dropdown */}
          <div className="ai-form-group">
            <label htmlFor="ai-section-select" className="ai-form-label">
              Course Section
            </label>
            <select
              id="ai-section-select"
              className="ai-select"
              value={selectedSectionId || ''}
              onChange={(e) => handleSectionChange(e.target.value)}
              aria-label="Select course section"
            >
              {sections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  Section {sec.number}: {sec.title} ({sec.lectures?.length || 0} lectures)
                </option>
              ))}
            </select>
          </div>

          {/* Topic / Lecture Dropdown (only visible when scopeType === 'topic') */}
          {scopeType === 'topic' && currentSection && (
            <div className="ai-form-group">
              <label htmlFor="ai-lecture-select" className="ai-form-label">
                Topic / Lecture
              </label>
              <select
                id="ai-lecture-select"
                className="ai-select"
                value={selectedLectureId || ''}
                onChange={(e) => setSelectedLectureId(e.target.value)}
                aria-label="Select lecture topic"
              >
                {(currentSection.lectures || []).map((lec, idx) => (
                  <option key={lec.id} value={lec.id}>
                    {idx + 1}. {lec.title} ({lec.durationLabel || '0m'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Selection Summary */}
          <div className="ai-summary-card">
            <div className="ai-summary-card__title">
              {scopeType === 'topic'
                ? currentLecture?.title || 'Selected Topic'
                : `Section ${currentSection?.number}: ${currentSection?.title}`}
            </div>
            <div className="ai-summary-card__meta">
              {scopeType === 'topic'
                ? `Section ${currentSection?.number} · Duration: ${currentLecture?.durationLabel || 'N/A'}`
                : `${currentSection?.lectures?.length || 0} total lectures in section`}
            </div>
          </div>

          {/* Length & URL Threshold Indicator */}
          <div
            className={`ai-threshold-box ${
              isOverThreshold ? 'ai-threshold-box--hybrid' : 'ai-threshold-box--direct'
            }`}
          >
            <div className="ai-threshold-box__icon">
              {isOverThreshold ? '📋' : '✓'}
            </div>
            <div className="ai-threshold-box__text">
              {isOverThreshold ? (
                <span>
                  <strong>Hybrid Context Mode:</strong> Complete course syllabus exceeds URL length (~
                  {Math.round(fullPromptText.length / 1024)} KB). Prompt will auto-copy to your clipboard, and chat will open with prefilled instructions.
                </span>
              ) : (
                <span>
                  <strong>Direct Deep Link:</strong> Prompt fits within safe URL limit and will open prefilled directly in chat.
                </span>
              )}
            </div>
            <span className="ai-threshold-box__badge">
              {fullPromptText.length.toLocaleString()} chars
            </span>
          </div>

          {/* Primary Platform Launch Actions */}
          <div className="ai-actions-grid">
            <button
              type="button"
              className="ai-btn-platform ai-btn-platform--chatgpt"
              onClick={() => handleLaunch('chatgpt')}
            >
              <span>💬</span> Ask ChatGPT
            </button>
            <button
              type="button"
              className="ai-btn-platform ai-btn-platform--claude"
              onClick={() => handleLaunch('claude')}
            >
              <span>⚡</span> Ask Claude
            </button>
          </div>

          {/* Auxiliary Tools: Copy Prompt & Download XML */}
          <div className="ai-aux-tools">
            <button
              type="button"
              className="ai-btn-aux"
              onClick={handleManualCopy}
            >
              <span>📋</span> Copy Full Prompt
            </button>
            <button
              type="button"
              className="ai-btn-aux"
              onClick={handleDownloadXml}
            >
              <span>📥</span> Download Course XML
            </button>
          </div>

          {/* Collapsible Prompt Preview */}
          <div>
            <button
              type="button"
              className="ai-preview-toggle"
              onClick={() => setPreviewExpanded((prev) => !prev)}
              aria-expanded={previewExpanded}
            >
              <span>{previewExpanded ? '▼ Hide Generated Prompt' : '▶ Preview Full Prompt'}</span>
              <span>{fullPromptText.length.toLocaleString()} characters</span>
            </button>
            {previewExpanded && (
              <pre className="ai-preview-box" tabIndex={0} aria-label="Generated Prompt Preview">
                {fullPromptText}
              </pre>
            )}
          </div>

          {/* Logged-In User Hint */}
          <div className="ai-hint-note">
            💡 <em>Note:</em> Make sure you are logged into ChatGPT or Claude in your browser. If not logged in, the AI platform will prompt for login first.
          </div>
        </div>
      </div>
    </div>
  );
}

