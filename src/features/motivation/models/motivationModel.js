import { showToast } from '../../../utils/toast.js';

/**
 * Curated list of 15 high-impact motivational messages for the daily popup dialog.
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
  "Clean code is the signature of a disciplined developer. Treat today's study as craft, not just a task.",
  "Don't worry about understanding everything at once. Build the habit first, and mastery will follow.",
  "Debugging is where true understanding is born. Embrace the challenges today and level up your problem-solving.",
  "Mastering Object-Oriented Design and Java concurrency starts with today's fundamentals. Stay relentless.",
  "The gap between who you are and who you want to become is closed by the code you write today.",
];

export const MOTIVATION_STORE_KEY = 'jct_motivation_store_v2';

/**
 * Fisher-Yates array shuffler to ensure non-deterministic, unbiased quote distribution.
 */
export function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Deterministically picks a fresh motivational message based on date and current streak.
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
 * Safely writes the motivation store to localStorage, preserving up to 25 pre-stored quotes.
 */
export function saveMotivationStore(store) {
  if (typeof localStorage === 'undefined') return;
  try {
    const cleanStore = {
      todayQuote: store?.todayQuote || null,
      queue: Array.isArray(store?.queue) ? store.queue.slice(0, 25) : [],
      lastPrefetchDate: store?.lastPrefetchDate || null,
    };
    localStorage.setItem(MOTIVATION_STORE_KEY, JSON.stringify(cleanStore));
  } catch {
    // ignore quota/security exceptions
  }
}

/**
 * Fills the quote queue with unique quotes from DEFAULT_MOTIVATION_MESSAGES
 * so that 10-15 quotes are pre-cached locally for future days.
 */
export function fillQueueWithDefaults(store, streak = 0, today = '', minCount = 14) {
  if (!store || !Array.isArray(store.queue)) return store;
  const existingTexts = new Set([
    ...(store.todayQuote?.text ? [store.todayQuote.text] : []),
    ...store.queue.map(q => q.text),
  ]);

  if (store.queue.length >= minCount) return store;

  // Find quotes from DEFAULT_MOTIVATION_MESSAGES not currently in queue or today's quote
  const available = DEFAULT_MOTIVATION_MESSAGES.filter(msg => !existingTexts.has(msg));
  const shuffledAvailable = shuffleArray(available);

  for (const text of shuffledAvailable) {
    if (store.queue.length >= minCount) break;
    store.queue.push({
      text,
      isAiGenerated: false,
      createdAt: today || new Date().toISOString().slice(0, 10),
    });
    existingTexts.add(text);
  }

  // If still below minCount, reshuffle pool to ensure queue stays full
  if (store.queue.length < minCount) {
    const pool = shuffleArray(DEFAULT_MOTIVATION_MESSAGES);
    for (const text of pool) {
      if (store.queue.length >= minCount) break;
      if (text !== store.todayQuote?.text) {
        store.queue.push({
          text,
          isAiGenerated: false,
          createdAt: today || new Date().toISOString().slice(0, 10),
        });
      }
    }
  }

  return store;
}

/**
 * Resolves today's quote with zero latency (instant render) and randomizes first launch.
 * 1. If todayQuote exists and matches today's date, returns it immediately.
 * 2. If first launch on this device (empty queue):
 *    - Shuffles the 15 curated quotes randomly.
 *    - Selects a unique random quote for today (different across user devices!).
 *    - Pre-stores the remaining 14 quotes in localStorage queue for upcoming days.
 * 3. If new day with existing queue:
 *    - Pops the next pre-cached quote from the user's localStorage queue.
 *    - Replenishes queue up to 14 quotes so quotes never run out.
 */
export function resolveTodayMotivation({ today, streak = 0 }) {
  const store = getMotivationStore();
  const currentDateKey = today || new Date().toISOString().slice(0, 10);

  // Already resolved for today
  if (store.todayQuote && store.todayQuote.date === currentDateKey && store.todayQuote.text) {
    fillQueueWithDefaults(store, streak, currentDateKey, 14);
    saveMotivationStore(store);
    return { quote: store.todayQuote, store };
  }

  // First launch on this device: randomize quote and pre-store entire pool
  if (store.queue.length === 0) {
    const shuffled = shuffleArray(DEFAULT_MOTIVATION_MESSAGES);
    const firstQuote = shuffled[0];
    store.todayQuote = {
      text: firstQuote,
      isAiGenerated: false,
      date: currentDateKey,
      createdAt: currentDateKey,
    };
    // Pre-cache all remaining 14 quotes in localStorage for future days
    store.queue = shuffled.slice(1).map(text => ({
      text,
      isAiGenerated: false,
      createdAt: currentDateKey,
    }));
  } else {
    // New day: consume from pre-stored queue (0ms delay)
    const next = store.queue.shift();
    store.todayQuote = {
      text: next.text,
      isAiGenerated: !!next.isAiGenerated,
      date: currentDateKey,
      createdAt: next.createdAt || currentDateKey,
    };
    // Replenish upcoming queue so tomorrow and upcoming 14 days have quotes ready
    fillQueueWithDefaults(store, streak, currentDateKey, 14);
  }

  saveMotivationStore(store);
  return { quote: store.todayQuote, store };
}

/**
 * Cycles to the next available quote from the pre-cached queue on demand.
 */
export function cycleNextMotivationQuote({ today, streak = 0 }) {
  const store = getMotivationStore();
  const currentDateKey = today || new Date().toISOString().slice(0, 10);

  fillQueueWithDefaults(store, streak, currentDateKey, 14);
  const next = store.queue.shift();
  if (next) {
    store.todayQuote = {
      text: next.text,
      isAiGenerated: !!next.isAiGenerated,
      date: currentDateKey,
      createdAt: next.createdAt || currentDateKey,
    };
  }
  fillQueueWithDefaults(store, streak, currentDateKey, 14);
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

const PREFETCH_COOLDOWN_KEY = 'jct_prefetch_cooldown_v1';
const PREFETCH_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown after API errors

/**
 * Checks whether the prefetch API call is currently in cooldown after a prior error.
 * Returns true if we should NOT call the API.
 */
function isPrefetchInCooldown() {
  try {
    const raw = localStorage.getItem(PREFETCH_COOLDOWN_KEY);
    if (!raw) return false;
    const { failedAt, retryAfter } = JSON.parse(raw);
    if (!failedAt) return false;
    return Date.now() < (failedAt + (retryAfter || PREFETCH_COOLDOWN_MS));
  } catch {
    return false;
  }
}

/**
 * Records a prefetch API failure with cooldown timer.
 * Uses the Retry-After header if available, otherwise defaults to 1 hour.
 */
function setPrefetchCooldown(retryAfterMs = PREFETCH_COOLDOWN_MS) {
  try {
    localStorage.setItem(PREFETCH_COOLDOWN_KEY, JSON.stringify({
      failedAt: Date.now(),
      retryAfter: Math.max(retryAfterMs, 60_000), // minimum 1 minute cooldown
    }));
  } catch {
    // ignore storage errors
  }
}

/**
 * Clears the prefetch cooldown (call after a successful API response).
 */
function clearPrefetchCooldown() {
  try {
    localStorage.removeItem(PREFETCH_COOLDOWN_KEY);
  } catch {
    // ignore
  }
}

/**
 * Parses the standard HTTP Retry-After header into milliseconds.
 * Supports both delta-seconds ("60") and HTTP-date formats.
 */
function parseRetryAfterMs(retryAfterHeader) {
  if (!retryAfterHeader) return PREFETCH_COOLDOWN_MS;
  const seconds = Number(retryAfterHeader);
  if (!isNaN(seconds) && seconds > 0) return seconds * 1000;
  // Try parsing as HTTP-date
  const date = Date.parse(retryAfterHeader);
  if (!isNaN(date)) return Math.max(date - Date.now(), 60_000);
  return PREFETCH_COOLDOWN_MS;
}

/**
 * Background silent prefetch of 2-3 quotes from OpenAI.
 * Runs asynchronously without blocking the UI or showing any spinner.
 *
 * Professional behavior:
 * - On success: enqueues AI quotes and clears any prior cooldown.
 * - On API error (429, 401, 5xx, network): silently falls back to curated quotes,
 *   records a cooldown timer (1 hour or Retry-After), and logs to console.warn.
 *   NO toast, NO notification — this is a background operation.
 * - Deduplication: skips if already prefetched today, already in cooldown, or queue is full.
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

  // Respect cooldown from prior API failures (prevents hammering a 429'd endpoint)
  if (!force && isPrefetchInCooldown()) {
    fillQueueWithDefaults(store, context?.streak || 0, currentDateKey, 3);
    saveMotivationStore(store);
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

    if (!res.ok) {
      // Parse Retry-After for intelligent backoff
      const retryAfterHeader = res.headers?.get?.('Retry-After') || null;
      const cooldownMs = (status === 429)
        ? parseRetryAfterMs(retryAfterHeader)
        : PREFETCH_COOLDOWN_MS;
      throw Object.assign(new Error(`OpenAI API error (${res.status})`), { cooldownMs });
    }

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
      clearPrefetchCooldown();
      const updatedStore = enqueueUpcomingQuotes(parsedQuotes.slice(0, count), currentDateKey);
      return updatedStore.queue;
    }
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);

    // Set cooldown so we don't hammer the API on subsequent page loads
    setPrefetchCooldown(err?.cooldownMs || PREFETCH_COOLDOWN_MS);

    // Silent background fallback — NO toast, NO notification for automatic prefetch.
    // Only log to console for developer diagnostics.
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[JCT] Background quote prefetch failed:', err?.message || err, '— using curated quotes. Cooldown active.');
    }

    // Fill queue with curated defaults and mark today as attempted
    store.lastPrefetchDate = currentDateKey;
    fillQueueWithDefaults(store, context?.streak || 0, currentDateKey, 3);
    saveMotivationStore(store);
    return store.queue;
  }

  return store.queue;
}

/**
 * Live generates or fetches a brand new fresh motivation quote immediately.
 * If user has saved an OpenAI API key, queries the API directly so the user can test their key in real-time.
 * If no key or on API failure, cycles to the next fresh quote from the curated pool.
 */
export async function generateFreshMotivationQuote({ apiKey, context, today = '' }) {
  const store = getMotivationStore();
  const currentDateKey = today || new Date().toISOString().slice(0, 10);

  if (!apiKey || !apiKey.trim()) {
    // No API key: cycle to next unique quote from local pool
    const cycled = cycleNextMotivationQuote({ today: currentDateKey, streak: context?.streak || 0 });
    return cycled.quote;
  }

  const prompt = `You are an expert developer study coach. The user is actively studying "${context?.courseTitle || 'Core Java'}".
Progress: ${context?.pct || 0}% complete (${context?.watchedCount || 0}/${context?.totalCount || 0} lectures), streak: ${context?.streak || 0} days.
Generate exactly ONE inspiring, concise, energetic study coaching quote (maximum 2 sentences, at most one emoji) for this study session.
Return ONLY the raw quote string directly, with no quotes or extra formatting.`;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 9000) : null;
  let status = null;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.9,
      }),
      signal: controller?.signal,
    });

    if (timeoutId) clearTimeout(timeoutId);
    status = res.status;
    if (!res.ok) throw new Error(`OpenAI API error (${res.status})`);

    const data = await res.json();
    let text = data?.choices?.[0]?.message?.content?.trim() || '';
    text = text.replace(/^["']|["']$/g, '').trim();

    if (text.length > 10) {
      const freshQuote = {
        text,
        isAiGenerated: true,
        date: currentDateKey,
        createdAt: currentDateKey,
      };
      store.todayQuote = freshQuote;
      saveMotivationStore(store);
      return freshQuote;
    }
    throw new Error('Empty response from AI');
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    // User-initiated: show a brief toast, but don't spam the Notification Center
    const explanation = explainPrefetchError(err, status);
    showToast(explanation, 'warning', 4000);

    // Fall back to a new unique quote from local pool
    const cycled = cycleNextMotivationQuote({ today: currentDateKey, streak: context?.streak || 0 });
    return cycled.quote;
  }
}

