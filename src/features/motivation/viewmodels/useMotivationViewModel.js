import { useState, useEffect, useCallback, useMemo } from 'react';
import { getStoredApiKey } from '../models/apiKeyModel.js';
import {
  resolveTodayMotivation,
  cycleNextMotivationQuote,
  prefetchUpcomingQuotes,
  generateFreshMotivationQuote,
  getMotivationStore,
} from '../models/motivationModel.js';
import { showToast } from '../../../utils/toast.js';

const SHOWN_KEY = 'jct_motivation_shown_v1';

export function getShownDate() {
  try {
    return JSON.parse(localStorage.getItem(SHOWN_KEY) || 'null')?.date || null;
  } catch {
    return null;
  }
}

export function setShownDate(dateKey) {
  try {
    localStorage.setItem(SHOWN_KEY, JSON.stringify({ date: dateKey }));
  } catch {
    // ignore
  }
}

export function triggerMotivationPopup() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jct:show_motivation'));
  }
}

/**
 * Headless Motivation ViewModel Hook
 * Implements professional offline-first prefetching:
 * - Instantly resolves today's quote from localStorage with 0ms latency and 0 loading spinner.
 * - Silently prefetches and queues 2-3 quotes in the background for upcoming days.
 * - When opened the next day, the next quote is already stored in localStorage and displays immediately.
 */
export function useMotivationViewModel({ today, stats, streak, courseTitle }) {
  const currentDateKey = useMemo(() => today || new Date().toISOString().slice(0, 10), [today]);

  // Synchronously resolve today's pre-cached quote on mount (0ms delay)
  const [resolved, setResolved] = useState(() => {
    return resolveTodayMotivation({ today: currentDateKey, streak: streak || 0 });
  });

  // Automatically determine initial visibility without cascading effect renders
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isNoModal = window.location.search.includes('nomodal');
    if (isNoModal) return false;
    const isHashTriggered = window.location.hash === '#motivation';
    const alreadyShown = getShownDate() === currentDateKey;
    if (isHashTriggered || !alreadyShown) {
      if (!isHashTriggered) {
        setShownDate(currentDateKey);
      }
      return true;
    }
    return false;
  });

  // Track the resolved quote corresponding to currentDateKey and streak
  const activeResolved = useMemo(() => {
    if (resolved?.quote?.date === currentDateKey) {
      return resolved;
    }
    return resolveTodayMotivation({ today: currentDateKey, streak: streak || 0 });
  }, [resolved, currentDateKey, streak]);

  const [loading, setLoading] = useState(false);

  // Live refresh/regenerate quote from API (or cycle if no key)
  const refreshQuote = useCallback(async (forceApi = true) => {
    setLoading(true);
    try {
      const apiKey = getStoredApiKey();
      const freshQuote = await generateFreshMotivationQuote({
        apiKey: forceApi ? apiKey : null,
        context: {
          pct: stats?.pct || 0,
          watchedCount: stats?.watchedCount || 0,
          totalCount: stats?.totalCount || 0,
          remainingSec: stats?.remainingSec || 0,
          streak: streak || 0,
          courseTitle: courseTitle || 'Core Java + AI',
        },
        today: currentDateKey,
      });

      if (freshQuote) {
        setResolved({ quote: freshQuote, store: getMotivationStore() });
        if (freshQuote.isAiGenerated) {
          showToast('✨ Generated fresh study message from OpenAI!', 'success', 3500);
        } else {
          showToast('Loaded new study quote from curated library', 'info', 2500);
        }
      }
    } catch {
      // Fallback already handled inside generateFreshMotivationQuote
    } finally {
      setLoading(false);
    }
  }, [currentDateKey, stats, streak, courseTitle]);

  // Handle global trigger events (e.g. from Settings preview or Command Palette)
  useEffect(() => {
    const handleTrigger = (e) => {
      setVisible(true);
      const shouldRefresh = e?.detail?.refreshFromApi ?? false;
      if (shouldRefresh) {
        refreshQuote(true);
      }
    };
    window.addEventListener('jct:show_motivation', handleTrigger);
    return () => window.removeEventListener('jct:show_motivation', handleTrigger);
  }, [refreshQuote]);

  // Silent background prefetch:
  // Pre-generates 2-3 quotes for tomorrow and upcoming days quietly in localStorage without any loading flash
  useEffect(() => {
    const apiKey = getStoredApiKey();
    if (!apiKey) return;

    const timer = setTimeout(() => {
      prefetchUpcomingQuotes({
        apiKey,
        context: {
          pct: stats?.pct || 0,
          watchedCount: stats?.watchedCount || 0,
          totalCount: stats?.totalCount || 0,
          remainingSec: stats?.remainingSec || 0,
          streak: streak || 0,
          courseTitle: courseTitle || 'Core Java + AI',
        },
        today: currentDateKey,
        count: 3,
      }).catch((err) => {
        // Safe silent warning in background
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('Background quote prefetch notice:', err?.message || err);
        }
      });
    }, 1200);

    return () => clearTimeout(timer);
  }, [currentDateKey, stats?.pct, stats?.watchedCount, stats?.totalCount, stats?.remainingSec, streak, courseTitle]);

  const cycleNextQuote = useCallback(() => {
    const next = cycleNextMotivationQuote({ today: currentDateKey, streak: streak || 0 });
    setResolved(next);
  }, [currentDateKey, streak]);

  const dismiss = useCallback(() => {
    setVisible(false);
  }, []);

  const show = useCallback(() => {
    setVisible(true);
  }, []);

  return {
    visible,
    message: activeResolved?.quote?.text || '',
    loading,
    isAiGenerated: !!activeResolved?.quote?.isAiGenerated,
    queueCount: activeResolved?.store?.queue?.length || 0,
    dismiss,
    show,
    cycleNextQuote,
    refreshQuote,
  };
}
