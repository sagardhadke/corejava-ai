import { showToast } from '../../../utils/toast.js';

/**
 * Curated list of 10 best motivational messages for the daily popup dialog.
 * Designed specifically for students learning Core Java, programming, and software engineering.
 */
export const DEFAULT_MOTIVATION_MESSAGES = [
  "Consistency beats intensity. Every concept you master today compounds into engineering excellence.",
  "Small daily progress compounds into career-defining results. Show up today and keep your momentum alive.",
  "The secret to mastering Java isn't talent—it's showing up every single day and writing code.",
  "Every complex architecture is built line by line, concept by concept. You're closer to job-ready today.",
  "Great engineers aren't made overnight. They are built through continuous daily focus and deliberate practice.",
  "You've built real momentum. Protect your streak today and turn effort into unstoppable confidence.",
  "Code by code, lecture by lecture. Focus on today's session and trust the learning process.",
  "The best investment you can make is in your own skills. Let's dive in and conquer today's goals.",
  "Progress isn't always loud, but showing up consistently is how breakthroughs happen. Let's write great code.",
  "Every bug you debug and every principle you learn is forging you into a confident, professional developer.",
];

export const MOTIVATION_STORE_KEY = 'jct_motivation_store_v2';

/**
 * Deterministically picks a fresh motivational message based on date and current streak.
 * This ensures the user gets a rotating, variety-rich message each day even without an API key.
 *
 * @param {number} [streak=0] - Current daily streak count
 * @param {string} [dateKey=''] - Date string in 'YYYY-MM-DD' format
 * @returns {string} Selected motivational message
 */
export function pickDefaultMotivation(streak = 0, dateKey = '') {
  if (dateKey) {
    const charCodeSum = dateKey.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const idx = (charCodeSum + Math.abs(streak)) % DEFAULT_MOTIVATION_MESSAGES.length;
    return DEFAULT_MOTIVATION_MESSAGES[idx];
  }
  const idx = Math.abs(streak) % DEFAULT_MOTIVATION_MESSAGES.length;
  return DEFAULT_MOTIVATION_MESSAGES[idx];
}

/**
 * Safely loads the motivation store from localStorage.
 * Structure:
 * {
 *   todayQuote: { text: string, isAiGenerated: boolean, date: string, createdAt: string } | null,
 *   queue: Array<{ text: string, isAiGenerated: boolean, createdAt: string }>,
 *   lastPrefetchDate: string | null
 * }
 */
export function getMotivationStore() {
  if (typeof localStorage === 'undefined') {
    return { todayQuote: null, queue: [], lastPrefetchDate: null };
  }
  try {
    const raw = localStorage.getItem(MOTIVATION_STORE_KEY);
    if (!raw) return { todayQuote: null, queue: [], lastPrefetchDate: null };
    const parsed = JSON.parse(raw);
    return {
      todayQuote: parsed?.todayQuote && typeof parsed.todayQuote.text === 'string' ? parsed.todayQuote : null,
      queue: Array.isArray(parsed?.queue) ? parsed.queue.filter(q => q && typeof q.text === 'string') : [],
      lastPrefetchDate: typeof parsed?.lastPrefetchDate === 'string' ? parsed.lastPrefetchDate : null,
    };
  } catch {
    return { todayQuote: null, queue: [], lastPrefetchDate: null };
  }
}

/**
 * Safely writes the motivation store to localStorage.
 */
export function saveMotivationStore(store) {
  if (typeof localStorage === 'undefined') return;
  try {
    const cleanStore = {
      todayQuote: store?.todayQuote || null,
      queue: Array.isArray(store?.queue) ? store.queue.slice(0, 10) : [],
      lastPrefetchDate: store?.lastPrefetchDate || null,
    };
    localStorage.setItem(MOTIVATION_STORE_KEY, JSON.stringify(cleanStore));
  } catch {
    // ignore quota/security exceptions
  }
}

/**
 * Fills the quote queue with unique default quotes from DEFAULT_MOTIVATION_MESSAGES
 * so that at least minCount (default 3) quotes are queued for future days.
 */
export function fillQueueWithDefaults(store, streak = 0, today = '', minCount = 3) {
  if (!store || !Array.isArray(store.queue)) return store;
  const existingTexts = new Set([
    ...(store.todayQuote?.text ? [store.todayQuote.text] : []),
    ...store.queue.map(q => q.text),
  ]);

  const baseIdx = streak >= 0 ? streak : 0;
  for (let i = 0; i < DEFAULT_MOTIVATION_MESSAGES.length && store.queue.length < minCount; i++) {
    const candidate = DEFAULT_MOTIVATION_MESSAGES[(baseIdx + i + 1) % DEFAULT_MOTIVATION_MESSAGES.length];
    if (!existingTexts.has(candidate)) {
      store.queue.push({
        text: candidate,
        isAiGenerated: false,
        createdAt: today || new Date().toISOString().slice(0, 10),
      });
      existingTexts.add(candidate);
    }
  }
  return store;
}

/**
 * Resolves today's quote with zero latency (instant render).
 * 1. If todayQuote exists and matches today's date, returns it.
 * 2. If it's a new day, pops the next quote from pre-stored queue.
 * 3. If queue was empty, generates a deterministic quote.
 * 4. Ensures the queue is replenished with at least 3 upcoming quotes.
 */
export function resolveTodayMotivation({ today, streak = 0 }) {
  const store = getMotivationStore();
  const currentDateKey = today || new Date().toISOString().slice(0, 10);

  // Already resolved for today
  if (store.todayQuote && store.todayQuote.date === currentDateKey && store.todayQuote.text) {
    fillQueueWithDefaults(store, streak, currentDateKey, 3);
    saveMotivationStore(store);
    return { quote: store.todayQuote, store };
  }

  // New day or uninitialized: consume from pre-stored queue if available
  if (store.queue.length > 0) {
    const next = store.queue.shift();
    store.todayQuote = {
      text: next.text,
      isAiGenerated: !!next.isAiGenerated,
      date: currentDateKey,
      createdAt: next.createdAt || currentDateKey,
    };
  } else {
    // Fallback: initial deterministic quote
    const defMsg = pickDefaultMotivation(streak, currentDateKey);
    store.todayQuote = {
      text: defMsg,
      isAiGenerated: false,
      date: currentDateKey,
      createdAt: currentDateKey,
    };
  }

  // Replenish upcoming queue so tomorrow already has 2-3 quotes ready
  fillQueueWithDefaults(store, streak, currentDateKey, 3);
  saveMotivationStore(store);
  return { quote: store.todayQuote, store };
}

/**
 * Cycles to the next available quote from the pre-cached queue on demand.
 */
export function cycleNextMotivationQuote({ today, streak = 0 }) {
  const store = getMotivationStore();
  const currentDateKey = today || new Date().toISOString().slice(0, 10);

  fillQueueWithDefaults(store, streak, currentDateKey, 3);
  const next = store.queue.shift();
  if (next) {
    store.todayQuote = {
      text: next.text,
      isAiGenerated: !!next.isAiGenerated,
      date: currentDateKey,
      createdAt: next.createdAt || currentDateKey,
    };
  }
  fillQueueWithDefaults(store, streak, currentDateKey, 3);
  saveMotivationStore(store);
  return { quote: store.todayQuote, store };
}

/**
 * Appends fresh AI-generated quotes into the upcoming queue in localStorage.
 */
export function enqueueUpcomingQuotes(quotes, today = '') {
  if (!Array.isArray(quotes) || quotes.length === 0) return getMotivationStore();
  const store = getMotivationStore();
  const currentDateKey = today || new Date().toISOString().slice(0, 10);

  const existingTexts = new Set([
    ...(store.todayQuote?.text ? [store.todayQuote.text] : []),
    ...store.queue.map(q => q.text),
  ]);

  const freshItems = quotes
    .filter(q => typeof q === 'string' && q.trim().length > 10 && !existingTexts.has(q.trim()))
    .map(q => ({
      text: q.trim(),
      isAiGenerated: true,
      createdAt: currentDateKey,
    }));

  if (freshItems.length > 0) {
    // Put AI generated quotes at the front of the queue so upcoming days use AI quotes
    store.queue = [...freshItems, ...store.queue.filter(q => !q.isAiGenerated)].slice(0, 6);
    store.lastPrefetchDate = currentDateKey;
    saveMotivationStore(store);
  }
  return store;
}

/**
 * Explains the precise technical cause of an OpenAI prefetch failure
 * in a user-friendly, professional format for the bottom-right toast notification.
 */
export function explainPrefetchError(err, status = null) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'Internet Offline: Please check your internet connection. Using curated study message.';
  }
  const msg = err?.message || '';
  if (err?.name === 'AbortError' || msg.includes('aborted') || msg.includes('timeout')) {
    return 'OpenAI Timeout: Connection timed out. Using curated study message.';
  }
  if (status === 401 || msg.includes('401')) {
    return 'OpenAI Auth Error (401): Invalid API key. Please verify your key in Settings. Using curated study message.';
  }
  if (status === 429 || msg.includes('429')) {
    return 'OpenAI Quota Limit (429): Rate limit or billing balance reached. Using curated study message.';
  }
  if ((status && status >= 500) || msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('504')) {
    return `OpenAI Server Down (${status || 503}): OpenAI / ChatGPT service is temporarily unreachable. Using curated study message.`;
  }
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'Network Error: Unable to connect to OpenAI. Using curated study message.';
  }
  return `AI Quote Notice: ${msg || 'Could not fetch remote quote'}. Using curated study message.`;
}

/**
 * Background silent prefetch of 2-3 quotes from OpenAI.
 * Runs asynchronously without blocking the UI or showing any spinner.
 * On error, immediately shows a detailed bottom-right toast notification explaining the exact issue
 * and seamlessly falls back to the 10 curated Core Java quotes.
 */
export async function prefetchUpcomingQuotes({ apiKey, context, today = '', count = 3, force = false }) {
  const store = getMotivationStore();
  const currentDateKey = today || new Date().toISOString().slice(0, 10);

  if (!apiKey) {
    fillQueueWithDefaults(store, context?.streak || 0, currentDateKey, 3);
    saveMotivationStore(store);
    return store.queue;
  }

  // Skip redundant API calls if we already prefetched today and have enough AI quotes
  const aiQuotesInQueue = store.queue.filter(q => q.isAiGenerated).length;
  if (!force && store.lastPrefetchDate === currentDateKey && aiQuotesInQueue >= 2) {
    return store.queue;
  }

  const prompt = `You are an expert developer study coach. The user is actively studying "${context?.courseTitle || 'Core Java'}".
Progress: ${context?.pct || 0}% complete (${context?.watchedCount || 0}/${context?.totalCount || 0} lectures), streak: ${context?.streak || 0} days.
Generate exactly ${count} distinct, inspiring, concise study coaching messages (maximum 2 sentences per message, at most one emoji) for upcoming study sessions.
Return ONLY a valid JSON array of ${count} strings, example: ["Message 1", "Message 2", "Message 3"]. Do not include markdown codeblocks or extra explanations.`;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 9000) : null;
  let status = null;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.85,
      }),
      signal: controller?.signal,
    });

    if (timeoutId) clearTimeout(timeoutId);
    status = res.status;
    if (!res.ok) throw new Error(`OpenAI API error (${res.status})`);

    const data = await res.json();
    const rawContent = data?.choices?.[0]?.message?.content?.trim() || '';

    let parsedQuotes = [];
    try {
      const cleanJson = rawContent.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      parsedQuotes = JSON.parse(cleanJson);
    } catch {
      // Fallback line-based splitting
      parsedQuotes = rawContent
        .split('\n')
        .map(line => line.replace(/^[-*0-9.)\s"]+/, '').replace(/"\s*,?$/, '').trim())
        .filter(line => line.length > 15);
    }

    if (Array.isArray(parsedQuotes) && parsedQuotes.length > 0) {
      const updatedStore = enqueueUpcomingQuotes(parsedQuotes.slice(0, count), currentDateKey);
      return updatedStore.queue;
    }
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    // Notify user in bottom-right toast with exact diagnostic information
    const explanation = explainPrefetchError(err, status);
    showToast(explanation, 'warning', 5000);

    // On failure or offline, ensure deterministic defaults fill the queue
    fillQueueWithDefaults(store, context?.streak || 0, currentDateKey, 3);
    saveMotivationStore(store);
    return store.queue;
  }

  return store.queue;
}
