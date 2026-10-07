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
  systemNoticePushEnabled: false, // System notices do NOT show in push notifications
  lastSentReminderDate: null,
};

/**
 * Determines whether a notification is classified as a System Notice.
 * System notices (service alerts, API errors, system info) are kept exclusively
 * in-app in the Notification Center and are never dispatched as native browser push notifications.
 */
export function isSystemNoticeNotification(type, title = '') {
  if (type === NOTIFICATION_TYPES.SYSTEM || type === 'system') {
    return true;
  }
  if (typeof title === 'string') {
    const t = title.toLowerCase();
    if (
      t.includes('system notice') ||
      t.includes('service alert') ||
      t.includes('system alert') ||
      t.includes('system update') ||
      t.includes('openai / chatgpt')
    ) {
      return true;
    }
  }
  return false;
}

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
 * Note: System notices are strictly in-app and never trigger browser push notifications.
 */
export function addNotification({
  type = NOTIFICATION_TYPES.SYSTEM,
  title,
  message,
  actionType = null,
  meta = {},
  pushOptions = null,
  skipPush = false,
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

  // Dispatch native browser push notification if push service is active & permission granted.
  // CRITICAL: System notices are strictly kept in-app and NEVER dispatched as push notifications.
  try {
    const isSystemNotice = isSystemNoticeNotification(type, title);
    const settings = getNotificationSettings();

    if (!skipPush && !isSystemNotice && settings.pushEnabled && getBrowserPermissionStatus() === 'granted') {
      sendBrowserPushNotification(title, {
        body: String(message || ''),
        tag: pushOptions?.tag || `jct-${type}-${newNotif.id}`,
        type,
        ...pushOptions,
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
  const NotificationApi =
    (typeof window !== 'undefined' && window.Notification) ||
    (typeof globalThis !== 'undefined' && globalThis.Notification);

  if (!NotificationApi) {
    return 'unsupported';
  }
  return NotificationApi.permission;
}

/**
 * Requests browser push notification permission from the user.
 */
export async function requestBrowserNotificationPermission() {
  const NotificationApi =
    (typeof window !== 'undefined' && window.Notification) ||
    (typeof globalThis !== 'undefined' && globalThis.Notification);

  if (!NotificationApi) {
    return 'unsupported';
  }
  try {
    const perm = await NotificationApi.requestPermission();
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
 * CRITICAL: System notices are strictly blocked and will never trigger push notifications.
 */
export function sendBrowserPushNotification(title, options = {}) {
  // Never dispatch System Notices as browser push notifications
  if (isSystemNoticeNotification(options.type, title)) {
    return null;
  }

  const NotificationApi =
    (typeof window !== 'undefined' && window.Notification) ||
    (typeof globalThis !== 'undefined' && globalThis.Notification);

  if (!NotificationApi || NotificationApi.permission !== 'granted') return null;

  try {
    const notif = new NotificationApi(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: options.tag || 'jct-study-reminder',
      renotify: options.renotify ?? true,
      body: options.body || '',
      ...options,
    });

    notif.onclick = () => {
      if (typeof window !== 'undefined') {
        window.focus?.();
        if (options.onClickUrl) {
          window.location.href = options.onClickUrl;
        }
      }
      notif.close?.();
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

    // 1. Add notification in Notification Center (dispatches push automatically if enabled)
    addNotification({
      type: NOTIFICATION_TYPES.REMINDER,
      title,
      message,
      actionType: 'open_today',
      meta: { streak, courseTitle },
      pushOptions: {
        tag: 'jct-daily-study-reminder',
      },
    });

    // 2. Mark as sent today
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
