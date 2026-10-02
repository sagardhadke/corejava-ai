import { useState, useEffect, useCallback } from 'react';
import { formatDuration } from '../../../utils/time.js';
import { getStoredApiKey } from '../models/apiKeyModel.js';
import { pickDefaultMotivation } from '../models/motivationModel.js';

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

async function fetchMotivationFromOpenAI(apiKey, context) {
  const prompt = `You are a friendly, encouraging study coach. The user is learning through an online course tracker (currently: "${context.courseTitle}").
Current stats: ${context.pct}% of the course complete (${context.watchedCount}/${context.totalCount} lectures), ${formatDuration(context.remainingSec)} of lecture time remaining, current streak ${context.streak} day(s).
Write ONE short, warm, motivating message (max 2 sentences, no emoji spam, at most one emoji) to greet them at the start of today's study session. Be specific and encouraging, not generic corporate positivity.`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 120,
      temperature: 0.9,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Empty response from OpenAI');
  return text;
}

/**
 * Headless Motivation ViewModel Hook
 */
export function useMotivationViewModel({ today, stats, streak, courseTitle }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAiGenerated, setIsAiGenerated] = useState(false);

  const generateOrPick = useCallback((force = false) => {
    const apiKey = getStoredApiKey();
    if (apiKey) {
      setLoading(true);
      setVisible(true);
      fetchMotivationFromOpenAI(apiKey, {
        pct: stats?.pct || 0,
        watchedCount: stats?.watchedCount || 0,
        totalCount: stats?.totalCount || 0,
        remainingSec: stats?.remainingSec || 0,
        streak: streak || 0,
        courseTitle: courseTitle || 'Core Java + AI',
      })
        .then((aiMsg) => {
          setMessage(aiMsg);
          setIsAiGenerated(true);
          if (!force) setShownDate(today);
        })
        .catch(() => {
          setMessage(pickDefaultMotivation(streak, today));
          setIsAiGenerated(false);
          if (!force) setShownDate(today);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setMessage(pickDefaultMotivation(streak, today));
      setIsAiGenerated(false);
      setVisible(true);
      if (!force) setShownDate(today);
    }
  }, [today, stats?.pct, stats?.watchedCount, stats?.totalCount, stats?.remainingSec, streak, courseTitle]);

  // Handle global trigger events (e.g. from Settings preview or Command Palette)
  useEffect(() => {
    const handleTrigger = () => {
      generateOrPick(true);
    };
    window.addEventListener('jct:show_motivation', handleTrigger);
    return () => window.removeEventListener('jct:show_motivation', handleTrigger);
  }, [generateOrPick]);

  // Initial mount check (daily auto-show or #motivation hash deep-link)
  useEffect(() => {
    const isHashTriggered = typeof window !== 'undefined' && window.location.hash === '#motivation';
    const isNoModal = typeof window !== 'undefined' && window.location.search.includes('nomodal');
    if (isNoModal) return;

    const alreadyShown = getShownDate() === today;
    if (isHashTriggered || !alreadyShown) {
      const timer = setTimeout(() => {
        generateOrPick(isHashTriggered);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [today, generateOrPick]);

  const dismiss = useCallback(() => {
    setVisible(false);
  }, []);

  return {
    visible,
    message,
    loading,
    isAiGenerated,
    dismiss,
    show: () => generateOrPick(true),
  };
}
