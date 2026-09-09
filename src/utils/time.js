// Formats seconds as "1h 24m" or "42m" — never shows seconds, keeps stat chips compact.
export function formatDuration(totalSec) {
  if (!totalSec || totalSec <= 0) return '0m';
  const h = Math.floor(totalSec / 3600);
  const m = Math.round((totalSec % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

// Longer form for detail contexts: "1h 24m 05s"
export function formatDurationLong(totalSec) {
  if (!totalSec || totalSec <= 0) return '0m';
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  const parts = [];
  if (h) parts.push(`${h}h`);
  if (m || h) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

// Adds spaces between adjacent duration tokens in a raw label like "41m51s"
// or "1h4m25s" (as parsed straight from the course XML), producing
// "41m 51s" / "1h 4m 25s" for display, without changing the underlying value.
export function spaceDurationLabel(label) {
  if (!label) return label;
  return label.replace(/([hms])(?=\d)/gi, '$1 ');
}

// Local (not UTC) date key, so "today" matches the user's wall-clock day.
export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(d, n) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatClock(d) {
  const weekday = WEEKDAYS[d.getDay()];
  const day = d.getDate();
  const month = MONTHS[d.getMonth()];
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${weekday} ${day} ${month} · ${h}:${m}:${s} ${ampm}`;
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export { WEEKDAYS, MONTHS };
