import { useState, useEffect, useCallback } from 'react';
import { formatDuration } from '../../../utils/time.js';
import { getStoredApiKey } from '../models/apiKeyModel.js';
import { pickDefaultMotivation } from '../models/motivationModel.js';

const SHOWN_KEY = 'jct_motivation_shown_v1';

function getShownDate() {
  try {
    return JSON.parse(localStorage.getItem(SHOWN_KEY) || 'null')?.date || null;
  } catch {
    return null;
  }
}

function setShownDate(dateKey) {
  try {
    localStorage.setItem(SHOWN_KEY, JSON.stringify({ date: dateKey }));
  } catch {
    // ignore
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

  useEffect(() => {
    const alreadyShown = getShownDate() === today || (typeof window !== 'undefined' && window.location.search.includes('nomodal'));
    if (alreadyShown) return;

    let cancelled = false;
    const apiKey = getStoredApiKey();

    if (apiKey) {
      queueMicrotask(() => {
        if (!cancelled) setLoading(true);
      });
      fetchMotivationFromOpenAI(apiKey, {
        pct: stats?.pct || 0,
        watchedCount: stats?.watchedCount || 0,
        totalCount: stats?.totalCount || 0,
        remainingSec: stats?.remainingSec || 0,
        streak: streak || 0,
        courseTitle: courseTitle || 'Course',
      })
        .then((aiMsg) => {
          if (cancelled) return;
          setMessage(aiMsg);
          setIsAiGenerated(true);
          setVisible(true);
          setShownDate(today);
        })
        .catch(() => {
          if (cancelled) return;
          setMessage(pickDefaultMotivation(streak, today));
          setIsAiGenerated(false);
          setVisible(true);
          setShownDate(today);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    } else {
      queueMicrotask(() => {
        if (cancelled) return;
        setMessage(pickDefaultMotivation(streak, today));
        setIsAiGenerated(false);
        setVisible(true);
        setShownDate(today);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [today, stats?.pct, stats?.watchedCount, stats?.totalCount, stats?.remainingSec, streak, courseTitle]);

  const dismiss = useCallback(() => {
    setVisible(false);
  }, []);

  return {
    visible,
    message,
    loading,
    isAiGenerated,
    dismiss,
  };
}
