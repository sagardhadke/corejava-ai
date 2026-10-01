import { useState, useMemo, useCallback } from 'react';
import { getStoredApiKey, setStoredApiKey, verifyOpenAiApiKey } from '../../motivation/models/apiKeyModel.js';
import {
  TARGET_PRESETS,
  PER_SECTION_OPTIONS,
  clampPerSectionCount,
  computeTargetProjection,
} from '../models/settingsModel.js';
import { formatDuration } from '../../../utils/time.js';

/**
 * Headless Settings ViewModel Hook
 * Encapsulates state, business actions, and calculated projections
 * without any UI or JSX coupling.
 */
export function useSettingsViewModel({
  settings = {},
  onUpdate,
  onResetAll,
  onUpdateStartDate,
  onResetStartDateToAuto,
  onDeleteEverything,
  course,
  stats,
  startDate,
}) {
  const [apiKey, setApiKey] = useState(() => getStoredApiKey());
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState(null);
  const [testingKey, setTestingKey] = useState(false);
  const [deleteEverythingOpen, setDeleteEverythingOpen] = useState(false);
  const [resetProgressOpen, setResetProgressOpen] = useState(false);

  const reloadApiKey = useCallback(() => {
    setApiKey(getStoredApiKey());
    setTestStatus(null);
  }, []);

  const handleSaveKey = useCallback(() => {
    const trimmed = apiKey.trim();
    setStoredApiKey(trimmed);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }, [apiKey]);

  const handleClearKey = useCallback(() => {
    setApiKey('');
    setStoredApiKey('');
    setTestStatus(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }, []);

  const handleTestKey = useCallback(async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setTestStatus({ ok: false, error: 'Please enter an API key to test.' });
      return;
    }
    setTestingKey(true);
    setTestStatus({ loading: true });
    try {
      const result = await verifyOpenAiApiKey(trimmed);
      setTestStatus({
        loading: false,
        ok: result.ok,
        message: result.message,
        error: result.error,
      });
      if (result.ok) {
        setStoredApiKey(trimmed);
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
      }
    } catch (err) {
      setTestStatus({ loading: false, ok: false, error: err.message || 'Verification failed.' });
    } finally {
      setTestingKey(false);
    }
  }, [apiKey]);

  const handleUpdateDailyTarget = useCallback((hours) => {
    if (typeof onUpdate === 'function') {
      onUpdate({ dailyTargetHours: hours });
    }
  }, [onUpdate]);

  const handleToggleAutoPlan = useCallback((autoPlan) => {
    if (typeof onUpdate === 'function') {
      onUpdate({ autoPlan });
    }
  }, [onUpdate]);

  const handleToggleStreakMode = useCallback((streakMode) => {
    if (typeof onUpdate === 'function') {
      onUpdate({ streakMode });
    }
  }, [onUpdate]);

  const handleUpdatePerSectionCount = useCallback((count) => {
    if (typeof onUpdate === 'function') {
      onUpdate({ perSectionVisibleCount: clampPerSectionCount(count) });
    }
  }, [onUpdate]);

  const handleConfirmDeleteEverything = useCallback(() => {
    if (typeof onDeleteEverything === 'function') {
      onDeleteEverything();
    }
    setDeleteEverythingOpen(false);
  }, [onDeleteEverything]);

  const handleConfirmResetProgress = useCallback(() => {
    if (typeof onResetAll === 'function') {
      onResetAll();
    }
    setResetProgressOpen(false);
  }, [onResetAll]);

  // Projected completion calculations from pure domain model
  const calcTarget = useMemo(() => {
    const proj = computeTargetProjection({
      course,
      stats,
      dailyTargetHours: settings.dailyTargetHours || 1.5,
      startDate,
    });
    if (!proj) return null;
    return {
      ...proj,
      dailyCoverage: formatDuration(proj.dailyTargetSec),
    };
  }, [course, stats, settings.dailyTargetHours, startDate]);

  return {
    // State
    apiKey,
    showKey,
    saved,
    testStatus,
    testingKey,
    deleteEverythingOpen,
    resetProgressOpen,
    calcTarget,
    targetPresets: TARGET_PRESETS,
    perSectionOptions: PER_SECTION_OPTIONS,

    // Setters
    setApiKey,
    setShowKey,
    setDeleteEverythingOpen,
    setResetProgressOpen,
    reloadApiKey,

    // Actions
    saveKey: handleSaveKey,
    clearKey: handleClearKey,
    testKey: handleTestKey,
    updateDailyTarget: handleUpdateDailyTarget,
    toggleAutoPlan: handleToggleAutoPlan,
    toggleStreakMode: handleToggleStreakMode,
    updatePerSectionCount: handleUpdatePerSectionCount,
    updateStartDate: onUpdateStartDate,
    resetStartDateToAuto: onResetStartDateToAuto,
    confirmDeleteEverything: handleConfirmDeleteEverything,
    confirmResetProgress: handleConfirmResetProgress,
  };
}
