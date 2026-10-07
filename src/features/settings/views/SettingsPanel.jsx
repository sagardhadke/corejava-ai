import { useState, useMemo, useRef, useEffect } from 'react';
import Drawer from '../../../components/Drawer.jsx';
import MemoryManagement from './MemoryManagement.jsx';
import BackupRestore from './BackupRestore.jsx';
import DeleteConfirmModal from './DeleteConfirmModal.jsx';
import CourseSelector from '../../../components/CourseSelector.jsx';
import { getStoredApiKey, setStoredApiKey, verifyOpenAiApiKey } from '../../motivation/models/apiKeyModel.js';
import { formatDuration } from '../../../utils/time.js';
import { TARGET_PRESETS, PER_SECTION_OPTIONS } from '../models/settingsModel.js';
import {
  getNotificationSettings,
  saveNotificationSettings,
  getBrowserPermissionStatus,
  requestBrowserNotificationPermission,
  sendBrowserPushNotification,
  addNotification,
  NOTIFICATION_TYPES,
} from '../../notifications/models/notificationModel.js';
import { showToast } from '../../../utils/toast.js';
import './SettingsPanel.css';

export default function SettingsPanel({
  open, onClose, settings, onUpdate, onResetAll,
  courses, activeCourseId, onSwitchCourse, onOpenImport,
  onCoursesChanged, onRestoredBackup, onDeleteEverything,
  course, stats, startDate, onUpdateStartDate,
  isStartDateManual, onResetStartDateToAuto,
}) {
  const [apiKey, setApiKey] = useState(() => getStoredApiKey());
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState(null);
  const [saved, setSaved] = useState(false);
  const [deleteEverythingOpen, setDeleteEverythingOpen] = useState(false);
  const [resetProgressOpen, setResetProgressOpen] = useState(false);

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setApiKey(getStoredApiKey());
      setTestStatus(null);
    }
  }

  const handleSaveKey = () => {
    setStoredApiKey(apiKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const handleClearKey = () => {
    setApiKey('');
    setStoredApiKey('');
    setTestStatus(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const handleTestKey = async () => {
    if (!apiKey.trim()) return;
    setTestStatus({ loading: true });
    const result = await verifyOpenAiApiKey(apiKey.trim());
    setTestStatus({
      loading: false,
      ok: result.ok,
      message: result.message,
      error: result.error,
    });
    if (result.ok) {
      setStoredApiKey(apiKey.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    }
  };

  const handleDeleteEverything = () => {
    onDeleteEverything();
    setDeleteEverythingOpen(false);
  };

  const handleResetProgress = () => {
    onResetAll();
    setResetProgressOpen(false);
  };

  // ---- Calculated target info ----
  const calcTarget = useMemo(() => {
    if (!course || !stats) return null;
    const dailyTarget = settings.dailyTargetHours || 1.5;
    const dailyTargetSec = dailyTarget * 3600;
    const remainingHours = stats.remainingSec / 3600;
    const exactDays = remainingHours / dailyTarget;
    const approxDays = Math.ceil(exactDays);

    // Parse start date
    const start = new Date(startDate + 'T00:00:00');
    const completionDate = new Date(start);
    completionDate.setDate(completionDate.getDate() + approxDays);

    const completionDateStr = completionDate.toLocaleDateString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });

    return {
      exactDays: exactDays.toFixed(1),
      approxDays,
      dailyCoverage: formatDuration(dailyTargetSec),
      completionDateStr,
      totalHours: (course.totalSeconds / 3600).toFixed(1),
      remainingHours: remainingHours.toFixed(1),
    };
  }, [course, stats, settings.dailyTargetHours, startDate]);

  return (
    <Drawer open={open} onClose={onClose} title="Settings" side="right" className="settings-drawer">
      <section className="settings-section">
        <h3>Active / default course</h3>
        <p className="settings-help">
          Choose which course opens by default. Each course keeps its own separate progress,
          plan, and streak — switching doesn't affect the other course's data.
        </p>
        <CourseSelector
          courses={courses}
          activeCourseId={activeCourseId}
          onSwitch={onSwitchCourse}
          variant="settings"
        />
        <button className="import-btn" onClick={onOpenImport}>Import course from XML…</button>
      </section>

      <section className="settings-section">
        <h3>Daily target</h3>
        <p className="settings-help">
          How much lecture time counts as "a day's work". Set to <strong>1.5h by default</strong> —
          drives the auto-highlighted lectures and your streak.
        </p>
        <div className="preset-row">
          {TARGET_PRESETS.map((p) => (
            <button
              key={p.value}
              className={`preset-chip ${settings.dailyTargetHours === p.value ? 'preset-chip--active' : ''}`}
              onClick={() => onUpdate({ dailyTargetHours: p.value })}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Calculated target card */}
        {calcTarget && (
          <div className="calc-target-card">
            <div className="calc-target-label">
              <SparkleIcon />
              <span>Calculated Target</span>
            </div>

            <div className="calc-target-row">
              <span className="calc-target-row__label">Days to finish course</span>
            </div>
            <div className="calc-target-highlight">
              <span className="calc-target-highlight__value">
                {calcTarget.exactDays} Days
              </span>
              <span className="calc-target-highlight__approx">
                (approx. {calcTarget.approxDays} Days)
              </span>
            </div>

            <div className="calc-target-row">
              <span className="calc-target-row__label">Daily video coverage</span>
              <span className="calc-target-row__value">{calcTarget.dailyCoverage}</span>
            </div>

            <div className="calc-target-divider" />

            <div className="calc-target-row">
              <span className="calc-target-row__label">Course start date</span>
              {isStartDateManual && (
                <button
                  type="button"
                  className="calc-target-reset-btn"
                  onClick={onResetStartDateToAuto}
                  title="Reset to auto-detect from first watched lecture"
                >
                  Reset to auto
                </button>
              )}
            </div>
            <input
              type="date"
              className="calc-target-datepicker"
              value={startDate || ''}
              onChange={(e) => onUpdateStartDate?.(e.target.value)}
            />
            <p className="settings-help settings-help--small">
              {isStartDateManual
                ? 'Manually overridden. Calendar and pacing start from this date.'
                : 'Auto-detected from your first watched lecture. Change it above to override.'}
            </p>

            <div className="calc-target-row">
              <span className="calc-target-row__label">Estimated completion</span>
              <span className="calc-target-row__value calc-target-row__value--date">{calcTarget.completionDateStr}</span>
            </div>

            <div className="calc-target-info">
              <InfoIcon />
              <span>
                At this pace, you will cover {calcTarget.dailyCoverage} of video content daily.
                You will finish in approx. {calcTarget.approxDays} Days (by ~{calcTarget.completionDateStr}).
              </span>
            </div>
          </div>
        )}
      </section>

      <section className="settings-section">
        <h3>Today's plan — auto highlight</h3>
        <p className="settings-help">
          When on (default), the tracker automatically picks the next unwatched lectures up to
          your daily target and highlights them in amber from the very first time you open the app —
          no manual setup needed. Once generated for a day, the plan is frozen and won't change
          again that day, even after a reload.
        </p>
        <ToggleRow
          label="Auto-pick today's lectures"
          checked={settings.autoPlan}
          onChange={(v) => onUpdate({ autoPlan: v })}
        />
      </section>

      <section className="settings-section">
        <div className="settings-section__head">
          <h3>Per-section progress display</h3>
          <span className="api-status-badge api-status-badge--default">
            {settings.perSectionVisibleCount || 7} items
          </span>
        </div>
        <p className="settings-help">
          Sets how many section cards are visible at once in the sidebar before scrolling.
          Defaults to 7 items (maximum 10). Automatically adapts if a course has fewer sections.
        </p>
        <PerSectionDropdown
          value={settings.perSectionVisibleCount || 7}
          onChange={(val) => onUpdate({ perSectionVisibleCount: val })}
        />
      </section>

      <section className="settings-section">
        <h3>Streak counts a day as active when</h3>
        <p className="settings-help">
          A manually confirmed "practice day" always counts too — even with zero lectures watched.
        </p>
        <div className="radio-group">
          <RadioRow
            name="streakMode"
            value="any"
            checked={settings.streakMode === 'any'}
            onChange={() => onUpdate({ streakMode: 'any' })}
            label="I watch at least 1 lecture"
          />
          <RadioRow
            name="streakMode"
            value="target"
            checked={settings.streakMode === 'target'}
            onChange={() => onUpdate({ streakMode: 'target' })}
            label="I hit my full daily target"
          />
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section__head">
          <h3>Daily motivation popup</h3>
          {apiKey?.trim() ? (
            <span className="api-status-badge api-status-badge--active">
              <span className="api-status-badge__dot" /> OpenAI Active
            </span>
          ) : (
            <span className="api-status-badge api-status-badge--default">
              Curated (10)
            </span>
          )}
        </div>

        <p className="settings-help">
          {apiKey?.trim()
            ? '✓ OpenAI API key is active. A fresh AI-written message will be generated daily.'
            : 'Enter an OpenAI API key below for fresh AI-written messages each day, or leave blank to use the 10 built-in messages.'}
        </p>

        <div className="api-key-box">
          <div className="api-key-input-wrap">
            <span className="api-key-icon" aria-hidden="true"><KeyIcon /></span>
            <input
              type={showKey ? 'text' : 'password'}
              className="api-key-input"
              placeholder="sk-proj-..."
              value={apiKey}
              onChange={(e) => {
                const val = e.target.value;
                setApiKey(val);
                setStoredApiKey(val.trim());
                setTestStatus(null);
              }}
              onBlur={(e) => {
                setStoredApiKey(e.target.value.trim());
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveKey();
              }}
              spellCheck={false}
              autoComplete="off"
            />
            {apiKey && (
              <button
                type="button"
                className="api-key-icon-btn"
                onClick={() => setShowKey((v) => !v)}
                title={showKey ? 'Hide key' : 'Show key'}
                aria-label={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            )}
            {apiKey && (
              <button
                type="button"
                className="api-key-icon-btn"
                onClick={handleClearKey}
                title="Clear key"
                aria-label="Clear key"
              >
                ✕
              </button>
            )}
          </div>

          <div className="api-key-actions">
            <button
              type="button"
              className="api-btn api-btn--preview"
              onClick={() => {
                onClose();
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('jct:show_motivation', { detail: { refreshFromApi: true } }));
                }, 120);
              }}
              title="Preview daily motivation popup with fresh quote from API"
            >
              ✨ Preview popup
            </button>
            <button
              type="button"
              className="api-btn api-btn--test"
              onClick={handleTestKey}
              disabled={!apiKey.trim() || testStatus?.loading}
            >
              {testStatus?.loading ? (
                <>
                  <span className="api-btn__spinner" /> Testing connection...
                </>
              ) : (
                <>
                  <LightningIcon /> Test API key
                </>
              )}
            </button>
            <button
              type="button"
              className="api-btn api-btn--save"
              onClick={handleSaveKey}
              disabled={testStatus?.loading}
            >
              {saved ? 'Saved ✓' : 'Save key'}
            </button>
          </div>

          {testStatus && !testStatus.loading && (
            <div className={`api-test-result ${testStatus.ok ? 'api-test-result--success' : 'api-test-result--error'}`}>
              <div className="api-test-result__icon">
                {testStatus.ok ? '✓' : '✕'}
              </div>
              <div className="api-test-result__content">
                <div className="api-test-result__title">
                  {testStatus.ok ? 'API Key Valid & Connected' : 'Verification Failed'}
                </div>
                <div className="api-test-result__desc">
                  {testStatus.ok ? testStatus.message : testStatus.error}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <NotificationSettingsSection onClose={onClose} />

      <section className="settings-section">
        <h3>Memory management</h3>
        <p className="settings-help">All courses currently stored on this device, and how much space each uses.</p>
        <MemoryManagement onCoursesChanged={onCoursesChanged} onRequestSetActive={onSwitchCourse} />
      </section>

      <section className="settings-section">
        <h3>Backup &amp; restore</h3>
        <BackupRestore onRestored={onRestoredBackup} />
      </section>

      <section className="settings-section">
        <h3>Danger zone</h3>
        <p className="settings-help">Clears every watched checkbox, today's plan, and streak history for the current course. This can't be undone.</p>
        <button className="danger-btn" onClick={() => setResetProgressOpen(true)}>Reset current course's progress</button>

        <p className="settings-help" style={{ marginTop: 16 }}>
          Removes everything — all imported courses, all progress, all settings — and restores the
          app to exactly how it was on first install.
        </p>
        <button className="danger-btn danger-btn--severe" onClick={() => setDeleteEverythingOpen(true)}>
          Delete everything &amp; reset to default
        </button>
      </section>

      <p className="settings-footnote">All data lives only in this browser's local storage — nothing is sent anywhere except direct OpenAI calls if you add a key above.</p>

      <DeleteConfirmModal
        open={resetProgressOpen}
        onClose={() => setResetProgressOpen(false)}
        onConfirm={handleResetProgress}
        title="Reset course progress"
        itemName={course?.title}
        warningMessage="This clears ALL watched checkmarks, today's plan, and streak history for this course. This action cannot be undone."
      />

      <DeleteConfirmModal
        open={deleteEverythingOpen}
        onClose={() => setDeleteEverythingOpen(false)}
        onConfirm={handleDeleteEverything}
        title="Delete everything & reset"
        warningMessage="This will delete ALL courses, ALL progress data, ALL settings, and reset the app to its initial state. This action cannot be undone."
      />
    </Drawer>
  );
}

function NotificationSettingsSection({ onClose }) {
  const [notifSettings, setNotifSettings] = useState(() => getNotificationSettings());
  const [perm, setPerm] = useState(() => getBrowserPermissionStatus());

  const handleToggleDailyReminder = (enabled) => {
    saveNotificationSettings({ dailyReminderEnabled: enabled });
    setNotifSettings((prev) => ({ ...prev, dailyReminderEnabled: enabled }));
    showToast(enabled ? 'Daily study reminders enabled' : 'Daily reminders paused', 'info', 2500);
  };

  const handleTimeChange = (newTime) => {
    saveNotificationSettings({ studyReminderTime: newTime });
    setNotifSettings((prev) => ({ ...prev, studyReminderTime: newTime }));
  };

  const handleRequestPush = async () => {
    const res = await requestBrowserNotificationPermission();
    setPerm(getBrowserPermissionStatus());
    setNotifSettings(getNotificationSettings());
    if (res === 'granted') {
      showToast('🔔 Browser push notifications active! Study alerts will be delivered daily.', 'success', 4000);
      sendBrowserPushNotification('Study Push Alerts Active 🔔', {
        body: 'You will receive reminders at your scheduled study time.',
      });
    } else if (res === 'denied') {
      showToast('Notifications blocked in browser. Please permit notifications in site settings.', 'warning', 4500);
    }
  };

  const handleTestAlert = () => {
    const title = 'Core Java Study Reminder ☕🔥';
    const body = "Don't let today slip away without writing code! Jump back into your Java course.";
    addNotification({
      type: NOTIFICATION_TYPES.REMINDER,
      title,
      message: body,
      actionType: 'open_today',
      meta: { isTest: true },
    });
    if (getBrowserPermissionStatus() === 'granted') {
      sendBrowserPushNotification(title, { body });
      showToast('Test push alert dispatched to your device! 🔔', 'success', 3500);
    } else {
      showToast('Test reminder added to Notification Center (enable Browser Push for system alerts)', 'info', 4000);
    }
  };

  return (
    <section className="settings-section">
      <div className="settings-section__head">
        <h3>Push Notifications &amp; Study Schedule</h3>
      </div>
      <p className="settings-help">
        Keep your coding habit unbreakable with native browser push alerts and in-app milestone notifications.
      </p>

      <div className="notif-settings-box">
        <div className="notif-settings-row">
          <div>
            <div className="notif-settings-title">Browser Push Permission</div>
            <div className="notif-settings-desc">
              Status: <strong className={`notif-status-badge notif-status-badge--${perm}`}>{perm.toUpperCase()}</strong>
            </div>
          </div>
          {perm !== 'granted' ? (
            <button
              type="button"
              className="notif-enable-btn"
              onClick={handleRequestPush}
            >
              Enable Push
            </button>
          ) : (
            <span className="notif-active-chip">Active ✓</span>
          )}
        </div>

        <ToggleRow
          label="Daily study reminder"
          checked={!!notifSettings.dailyReminderEnabled}
          onChange={handleToggleDailyReminder}
        />

        {notifSettings.dailyReminderEnabled && (
          <div className="notif-time-select-row">
            <span className="notif-time-label">Daily Reminder Time:</span>
            <input
              type="time"
              className="notif-time-input"
              value={notifSettings.studyReminderTime || '20:00'}
              onChange={(e) => handleTimeChange(e.target.value)}
            />
          </div>
        )}

        <div style={{ marginTop: '10px', padding: '6px 10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '6px', fontSize: '11px', color: 'var(--ink-soft, #a1a1aa)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span aria-hidden="true">🛡️</span>
          <span>System notices &amp; service alerts stay strictly in-app (never sent as push notifications).</span>
        </div>

        <div className="notif-settings-actions">
          <button
            type="button"
            className="api-btn api-btn--test"
            onClick={handleTestAlert}
          >
            🔔 Test notification
          </button>
          <button
            type="button"
            className="api-btn api-btn--preview"
            onClick={() => {
              if (onClose) onClose();
              setTimeout(() => {
                window.location.hash = '#notifications';
              }, 100);
            }}
          >
            Open notification hub →
          </button>
        </div>
      </div>
    </section>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <span className={`toggle ${checked ? 'toggle--on' : ''}`} onClick={() => onChange(!checked)} role="switch" aria-checked={checked}>
        <span className="toggle__thumb" />
      </span>
    </label>
  );
}

function RadioRow({ name, value, checked, onChange, label }) {
  return (
    <label className="radio-row">
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} />
      <span className="radio-dot" />
      <span>{label}</span>
    </label>
  );
}

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z"
        fill="currentColor" />
      <path d="M19 15l1.04 3.13L23 19l-2.96.87L19 23l-1.04-3.13L15 19l2.96-.87L19 15z"
        fill="currentColor" opacity="0.5" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 16v-4m0-4h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 2l-2 2m-1.5 1.5L14 9l-1.5-1.5L11 9l1.5 1.5L11 12l-1.5-1.5L8 12l1.5 1.5-4.24 4.24a5 5 0 1 1-1.41-1.41L8 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LightningIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="rgba(255, 184, 0, 0.25)" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PerSectionDropdown({ value = 7, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const selected = PER_SECTION_OPTIONS.find((o) => o.value === value) || PER_SECTION_OPTIONS.find((o) => o.value === 7) || PER_SECTION_OPTIONS[0];

  return (
    <div className="ps-select-root" ref={ref}>
      <button
        type="button"
        className={`ps-select-trigger ${open ? 'ps-select-trigger--open' : ''}`}
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Change number of visible section items"
      >
        <div className="ps-select-trigger__left">
          <span className="ps-select-trigger__icon" aria-hidden="true"><LayersIcon /></span>
          <span className="ps-select-trigger__value">{selected.label}</span>
          {selected.tag && (
            <span className="ps-select-trigger__tag">{selected.tag}</span>
          )}
        </div>
        <span className={`ps-select-trigger__arrow ${open ? 'ps-select-trigger__arrow--open' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="ps-select-dropdown" role="listbox">
          <div className="ps-select-dropdown__header">Visible section cards (Max 10)</div>
          {PER_SECTION_OPTIONS.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                type="button"
                key={opt.value}
                className={`ps-select-option ${isSelected ? 'ps-select-option--selected' : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                role="option"
                aria-selected={isSelected}
              >
                <div className="ps-select-option__left">
                  <div className="ps-select-option__radio">
                    <div className={`ps-select-option__dot ${isSelected ? 'ps-select-option__dot--on' : ''}`} />
                  </div>
                  <div className="ps-select-option__info">
                    <div className="ps-select-option__title">
                      {opt.label}
                      {opt.tag && <span className="ps-select-option__tag">{opt.tag}</span>}
                    </div>
                    <div className="ps-select-option__desc">{opt.desc}</div>
                  </div>
                </div>
                {isSelected && (
                  <span className="ps-select-option__check" aria-hidden="true">✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

