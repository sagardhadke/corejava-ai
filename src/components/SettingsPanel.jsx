import { useState, useMemo } from 'react';
import Drawer from './Drawer';
import MemoryManagement from './MemoryManagement';
import BackupRestore from './BackupRestore';
import DeleteConfirmModal from './DeleteConfirmModal';
import CourseSelector from './CourseSelector';
import { getStoredApiKey, setStoredApiKey } from '../utils/apiKey';
import { formatDuration } from '../utils/time';
import './SettingsPanel.css';

const TARGET_PRESETS = [
  { label: '1h', value: 1 },
  { label: '1.5h', value: 1.5 },
  { label: '2h', value: 2 },
  { label: '3h', value: 3 },
];

export default function SettingsPanel({
  open, onClose, settings, onUpdate, onResetAll,
  courses, activeCourseId, onSwitchCourse, onOpenImport,
  onCoursesChanged, onRestoredBackup, onDeleteEverything,
  course, stats, startDate, onUpdateStartDate,
  isStartDateManual, onResetStartDateToAuto,
}) {
  const [apiKey, setApiKey] = useState(() => getStoredApiKey());
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setApiKey(getStoredApiKey());
    }
  }

  const [saved, setSaved] = useState(false);
  const [deleteEverythingOpen, setDeleteEverythingOpen] = useState(false);
  const [resetProgressOpen, setResetProgressOpen] = useState(false);

  const handleSaveKey = () => {
    setStoredApiKey(apiKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
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
    <Drawer open={open} onClose={onClose} title="Settings" side="right">
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
        <h3>Daily motivation popup</h3>
        <p className="settings-help">
          {apiKey?.trim()
            ? '✓ OpenAI API key is active. A fresh AI-written message will be generated daily.'
            : 'Enter an OpenAI API key below for fresh AI-written messages each day, or leave blank to use the 10 built-in messages.'}
        </p>
        <input
          type="password"
          className="api-key-input"
          placeholder="sk-..."
          value={apiKey}
          onChange={(e) => {
            const val = e.target.value;
            setApiKey(val);
            setStoredApiKey(val.trim());
          }}
          onBlur={(e) => {
            setStoredApiKey(e.target.value.trim());
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSaveKey();
          }}
        />
        <button className="save-key-btn" onClick={handleSaveKey}>{saved ? 'Saved ✓' : 'Save API key'}</button>
      </section>

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
