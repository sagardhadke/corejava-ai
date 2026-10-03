import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
  getUnreadNotificationCount,
  getNotificationSettings,
  saveNotificationSettings,
  getBrowserPermissionStatus,
  requestBrowserNotificationPermission,
  sendBrowserPushNotification,
  checkAndTriggerScheduledReminder,
  addNotification,
  NOTIFICATION_TYPES,
} from '../models/notificationModel.js';
import { showToast } from '../../../utils/toast.js';

/**
 * Headless Notifications ViewModel Hook
 * Connects UI views to persistent notifications, system events, and Web Push services.
 */
export function useNotificationsViewModel({ streak = 0, courseTitle = 'Core Java + AI', remainingLectures = 0 } = {}) {
  const [allNotifications, setAllNotifications] = useState(() => getNotifications());
  const [unreadCount, setUnreadCount] = useState(() => getUnreadNotificationCount());
  const [filter, setFilter] = useState('all');
  const [settings, setSettings] = useState(() => getNotificationSettings());
  const [permissionStatus, setPermissionStatus] = useState(() => getBrowserPermissionStatus());

  // Reload notifications & settings from storage
  const refresh = useCallback(() => {
    setAllNotifications(getNotifications());
    setUnreadCount(getUnreadNotificationCount());
    setSettings(getNotificationSettings());
    setPermissionStatus(getBrowserPermissionStatus());
  }, []);

  // Listen to cross-system notification updates
  useEffect(() => {
    const handleUpdate = () => refresh();
    window.addEventListener('jct:notifications_updated', handleUpdate);
    window.addEventListener('jct:notification_settings_updated', handleUpdate);
    return () => {
      window.removeEventListener('jct:notifications_updated', handleUpdate);
      window.removeEventListener('jct:notification_settings_updated', handleUpdate);
    };
  }, [refresh]);

  // Global Toast event bridge: automatically record system warnings/errors (e.g. OpenAI/ChatGPT errors)
  useEffect(() => {
    const handleToast = (e) => {
      const detail = e.detail;
      if (!detail || !detail.message) return;

      // Only capture warning and error toasts into Notification Center
      if (detail.type === 'warning' || detail.type === 'error') {
        const isAiError = detail.message.toLowerCase().includes('openai') || detail.message.toLowerCase().includes('chatgpt');
        addNotification({
          type: NOTIFICATION_TYPES.SYSTEM,
          title: isAiError ? 'OpenAI / ChatGPT Service Alert' : 'System Notice',
          message: detail.message,
          actionType: isAiError ? 'open_settings' : null,
          meta: { toastType: detail.type },
        });
      }
    };

    window.addEventListener('jct:toast', handleToast);
    return () => window.removeEventListener('jct:toast', handleToast);
  }, []);

  // Background scheduled study reminder worker (evaluates every 30 seconds)
  useEffect(() => {
    const checkReminder = () => {
      checkAndTriggerScheduledReminder({
        streak,
        courseTitle,
        remainingLectures,
      });
    };

    // Check once immediately on mount
    checkReminder();

    const interval = setInterval(checkReminder, 30000);
    return () => clearInterval(interval);
  }, [streak, courseTitle, remainingLectures]);

  // Filtered notifications list
  const filteredNotifications = useMemo(() => {
    if (filter === 'all') return allNotifications;
    return allNotifications.filter((n) => n.type === filter);
  }, [allNotifications, filter]);

  // Actions
  const handleMarkRead = useCallback((id) => {
    markNotificationRead(id);
    refresh();
  }, [refresh]);

  const handleMarkAllRead = useCallback(() => {
    markAllNotificationsRead();
    refresh();
    showToast('All notifications marked as read', 'info', 2500);
  }, [refresh]);

  const handleDeleteItem = useCallback((id) => {
    deleteNotification(id);
    refresh();
  }, [refresh]);

  const handleClearAll = useCallback(() => {
    clearAllNotifications();
    refresh();
    showToast('Notification center cleared', 'info', 2500);
  }, [refresh]);

  const handleUpdateSettings = useCallback((updates) => {
    saveNotificationSettings(updates);
    refresh();
  }, [refresh]);

  const handleEnablePush = useCallback(async () => {
    const perm = await requestBrowserNotificationPermission();
    refresh();
    if (perm === 'granted') {
      showToast('🔔 Browser push notifications enabled! Daily study alerts are active.', 'success', 4500);
      sendBrowserPushNotification('Study Notifications Activated! 🔔', {
        body: 'You will receive reminders to keep your Core Java streak alive.',
      });
    } else if (perm === 'denied') {
      showToast('Notifications blocked in browser. Please allow notifications in site permissions.', 'warning', 5000);
    }
    return perm;
  }, [refresh]);

  const handleSendTestNotification = useCallback(() => {
    const title = 'Java Study Reminder ☕🔥';
    const message = streak > 0
      ? `Protect your ${streak}-day streak! Keep up the great coding momentum today.`
      : 'Ready to master Core Java? Today is a great day to learn and write clean code!';

    // 1. Record in Notification Center
    addNotification({
      type: NOTIFICATION_TYPES.REMINDER,
      title,
      message,
      actionType: 'open_today',
      meta: { isTest: true },
    });

    // 2. Dispatch push notification if allowed
    const status = getBrowserPermissionStatus();
    if (status === 'granted') {
      sendBrowserPushNotification(title, {
        body: message,
        tag: 'jct-test-reminder',
      });
      showToast('🔔 Test push notification dispatched to your browser!', 'success', 3500);
    } else {
      showToast('Added test reminder to Notification Center (enable Browser Push for system popups)', 'info', 4000);
    }
  }, [streak]);

  return {
    notifications: filteredNotifications,
    allNotifications,
    unreadCount,
    filter,
    setFilter,
    settings,
    permissionStatus,
    markRead: handleMarkRead,
    markAllRead: handleMarkAllRead,
    deleteItem: handleDeleteItem,
    clearAll: handleClearAll,
    updateSettings: handleUpdateSettings,
    enablePush: handleEnablePush,
    sendTestNotification: handleSendTestNotification,
    refresh,
  };
}
