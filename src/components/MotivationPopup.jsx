import { useEffect, useState } from 'react';
import { formatDuration } from '../utils/time';
import { getStoredApiKey } from '../utils/apiKey';
import './MotivationPopup.css';

const SHOWN_KEY = 'jct_motivation_shown_v1'; // { date: 'YYYY-MM-DD' } — global, not per-course

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
    // ignore storage errors — worst case the popup shows again
  }
}

const FALLBACK_LINES = [
  "You're building real momentum. Show up today and keep the streak alive.",
  "Every lecture you finish is closer to job-ready. Let's go.",
  "Consistency beats intensity. One more day, one more step forward.",
  "You've come this far — don't stop the streak now.",
  "Small daily progress compounds into big results. Today counts too.",
];

function pickFallbackLine(streak) {
  const idx = Math.abs(streak) % FALLBACK_LINES.length;
  return FALLBACK_LINES[idx];
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

export default function MotivationPopup({ today, stats, streak, courseTitle }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    const alreadyShown = getShownDate() === today;
    if (alreadyShown) return;

    let cancelled = false;
    const apiKey = getStoredApiKey();

    async function run() {
      setVisible(true);
      setShownDate(today);

      if (!apiKey) {
        setMessage(pickFallbackLine(streak));
        setUsedFallback(true);
        return;
      }

      setLoading(true);
      try {
        const text = await fetchMotivationFromOpenAI(apiKey, {
          pct: stats.pct,
          watchedCount: stats.watchedCount,
          totalCount: stats.totalCount,
          remainingSec: stats.remainingSec,
          streak,
          courseTitle,
        });
        if (!cancelled) {
          setMessage(text);
          setUsedFallback(false);
        }
      } catch {
        if (!cancelled) {
          setMessage(pickFallbackLine(streak));
          setUsedFallback(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  if (!visible) return null;

  return (
    <div className="mp-overlay" onClick={() => setVisible(false)}>
      <div className="mp-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Daily motivation">
        <div className="mp-icon">☀️</div>
        <h2>Good to see you today</h2>
        {loading ? (
          <p className="mp-message mp-message--loading">Getting your motivation ready…</p>
        ) : (
          <p className="mp-message">{message}</p>
        )}
        <div className="mp-stats-row">
          <span><strong>{stats.pct}%</strong> complete</span>
          <span><strong>{streak}</strong> day streak</span>
          <span><strong>{formatDuration(stats.remainingSec)}</strong> left</span>
        </div>
        {usedFallback && !loading && (
          <p className="mp-fallback-note">
            {getStoredApiKey()?.trim()
              ? "Couldn't reach OpenAI just now, so here's a message from the backup list."
              : 'Add an OpenAI API key in Settings for a fresh AI-written message each day.'}
          </p>
        )}
        <button className="mp-btn" onClick={() => setVisible(false)}>Let's get started</button>
      </div>
    </div>
  );
}
