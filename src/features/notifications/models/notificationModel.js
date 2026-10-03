/**
 * Notifications Domain Model & Browser Push Notification Service
 * Enterprise-grade state management, Web Notification API integration, and scheduled study alerts.
 */

export const NOTIFICATIONS_STORAGE_KEY = 'jct_notifications_v1';
export const NOTIFICATION_SETTINGS_KEY = 'jct_notification_settings_v1';

export const NOTIFICATION_TYPES = {
  ACHIEVEMENT: 'achievement',
  REMINDER: 'reminder',
  SYSTEM: 'system',
  STREAK: 'streak',
};

export const DEFAULT_NOTIFICATION_SETTINGS = {
  pushEnabled: false,
  studyReminderTime: '20:00', // 8:00 PM default reminder
  dailyReminderEnabled: true,
  achievementAlerts: true,
  streakAlerts: true,
  lastSentReminderDate: null,
};

/**
 * Safely retrieves stored notifications from localStorage.
 * Always returns an array sorted chronologically (newest first).
 */
export function getNotifications() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.filter((item) => item && typeof item.title === 'string');
  } catch {
    return [];
  }
}

/**
 * Safely persists notifications to localStorage (capped at 60 items).
 */
export function saveNotifications(notifications) {
  if (typeof localStorage === 'undefined') return;
  try {
    const cleanList = Array.isArray(notifications) ? notifications.slice(0, 60) : [];
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(cleanList));
  } catch {
    // ignore quota/storage limits
  }
}

/**
 * Adds a new notification to the store and dispatches an update event.
 */
export function addNotification({
  type = NOTIFICATION_TYPES.SYSTEM,
  title,
  message,
  actionType = null,
  meta = {},
}) {
  if (!title) return null;
  const current = getNotifications();

  // Deduplicate identical system alerts occurring within 30 seconds
  const isDuplicate = current.some(
    (n) =>
      n.title === title &&
      n.message === message &&
      Date.now() - n.timestamp < 30000
  );
  if (isDuplicate) return null;

  const newNotif = {
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    title: String(title),
    message: String(message || ''),
    timestamp: Date.now(),
    read: false,
    actionType,
    meta,
  };

  const updated = [newNotif, ...current].slice(0, 60);
  saveNotifications(updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jct:notifications_updated', { detail: { newNotif, count: updated.length } }));
  }

  // Dispatch native browser push notification if push service is active & permission granted
  try {
    const settings = getNotificationSettings();
    if (settings.pushEnabled && getBrowserPermissionStatus() === 'granted') {
      sendBrowserPushNotification(title, {
        body: String(message || ''),
        tag: `jct-${type}-${newNotif.id}`,
      });
    }
  } catch {
    // ignore in environments without Notification API
  }

  return newNotif;
}

/**
 * Marks a specific notification as read.
 */
export function markNotificationRead(id) {
  const current = getNotifications();
  let changed = false;
  const updated = current.map((n) => {
    if (n.id === id && !n.read) {
      changed = true;
      return { ...n, read: true };
    }
    return n;
  });

  if (changed) {
    saveNotifications(updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jct:notifications_updated'));
    }
  }
  return updated;
}

/**
 * Marks all notifications as read.
 */
export function markAllNotificationsRead() {
  const current = getNotifications();
  const updated = current.map((n) => ({ ...n, read: true }));
  saveNotifications(updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jct:notifications_updated'));
  }
  return updated;
}

/**
 * Deletes a single notification.
 */
export function deleteNotification(id) {
  const current = getNotifications();
  const updated = current.filter((n) => n.id !== id);
  saveNotifications(updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jct:notifications_updated'));
  }
  return updated;
}

/**
 * Clears all notifications.
 */
export function clearAllNotifications() {
  saveNotifications([]);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jct:notifications_updated'));
  }
  return [];
}

/**
 * Returns the unread notification count.
 */
export function getUnreadNotificationCount() {
  return getNotifications().filter((n) => !n.read).length;
}

/**
 * Retrieves push and reminder settings from localStorage.
 */
export function getNotificationSettings() {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_NOTIFICATION_SETTINGS };
  try {
    const raw = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_NOTIFICATION_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  }
}

/**
 * Saves notification settings to localStorage.
 */
export function saveNotificationSettings(settings) {
  if (typeof localStorage === 'undefined') return;
  try {
    const current = getNotificationSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('jct:notification_settings_updated', { detail: updated }));
    }
  } catch {
    // ignore
  }
}

/**
 * Detects current browser Notification API permission.
 * Returns 'granted' | 'denied' | 'default' | 'unsupported'.
 */
export function getBrowserPermissionStatus() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Requests browser push notification permission from the user.
 */
export async function requestBrowserNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      saveNotificationSettings({ pushEnabled: true });
    } else {
      saveNotificationSettings({ pushEnabled: false });
    }
    return perm;
  } catch {
    return 'denied';
  }
}

/**
 * Dispatches a native browser push notification if permission is granted.
 */
export function sendBrowserPushNotification(title, options = {}) {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  if (Notification.permission !== 'granted') return null;

  try {
    const notif = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: options.tag || 'jct-study-reminder',
      renotify: options.renotify ?? true,
      body: options.body || '',
      ...options,
    });

    notif.onclick = () => {
      window.focus();
      if (options.onClickUrl) {
        window.location.href = options.onClickUrl;
      }
      notif.close();
    };

    return notif;
  } catch {
    return null;
  }
}

/**
 * Checks current time against scheduled study reminder and dispatches alerts if due.
 */
export function checkAndTriggerScheduledReminder(context = {}) {
  const settings = getNotificationSettings();
  if (!settings.dailyReminderEnabled) return false;

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);

  if (settings.lastSentReminderDate === todayKey) {
    return false; // Already sent today
  }

  const [targetH, targetM] = (settings.studyReminderTime || '20:00').split(':').map(Number);
  const currentH = now.getHours();
  const currentM = now.getMinutes();

  // If current time reached or passed the reminder hour & minute
  if (currentH > targetH || (currentH === targetH && currentM >= targetM)) {
    const streak = context.streak || 0;
    const courseTitle = context.courseTitle || 'Core Java + AI';
    const remaining = context.remainingLectures ?? 'some';

    const title = `Time to Study Core Java! ☕🔥`;
    const message = streak > 0
      ? `Protect your ${streak}-day streak! You have ${remaining} lectures remaining in ${courseTitle}.`
      : `Ready for today's progress? Open ${courseTitle} and conquer today's goals!`;

    // 1. Add notification in Notification Center
    addNotification({
      type: NOTIFICATION_TYPES.REMINDER,
      title,
      message,
      actionType: 'open_today',
      meta: { streak, courseTitle },
    });

    // 2. Dispatch browser push notification if permission is active
    if (settings.pushEnabled && getBrowserPermissionStatus() === 'granted') {
      sendBrowserPushNotification(title, {
        body: message,
        tag: 'jct-daily-study-reminder',
      });
    }

    // 3. Mark as sent today
    saveNotificationSettings({ lastSentReminderDate: todayKey });
    return true;
  }

  return false;
}

/**
 * Formats relative time for notification items (e.g. "Just now", "5m ago", "Yesterday").
 */
export function formatNotificationTime(timestamp) {
  if (!timestamp) return '';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 45) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 172800) return 'Yesterday';
  const d = new Date(timestamp);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
