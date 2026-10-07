import { useEffect } from 'react';
import { formatNotificationTime } from '../models/notificationModel.js';
import './NotificationsPanel.css';

/**
 * NotificationsPanel View Component
 * Slide-out Notification Center Drawer with categorized tabs, push notification controls,
 * and actionable links to Badges, Streaks, and Settings.
 */
export default function NotificationsPanel({
  open,
  onClose,
  viewModel,
  onOpenBadges,
  onOpenStreak,
  onOpenToday,
  onOpenSettings,
}) {
  const {
    notifications,
    allNotifications,
    unreadCount,
    filter,
    setFilter,
    settings,
    permissionStatus,
    markRead,
    markAllRead,
    deleteItem,
    clearAll,
    updateSettings,
    enablePush,
    sendTestNotification,
  } = viewModel;

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Lock body scroll when panel is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const handleActionClick = (notif) => {
    markRead(notif.id);
    onClose();
    if (notif.actionType === 'open_badges' && onOpenBadges) onOpenBadges();
    else if (notif.actionType === 'open_streak' && onOpenStreak) onOpenStreak();
    else if (notif.actionType === 'open_today' && onOpenToday) onOpenToday();
    else if (notif.actionType === 'open_settings' && onOpenSettings) onOpenSettings();
  };

  return (
    <div className="notif-drawer-root" role="dialog" aria-modal="true" aria-label="Notification Center">
      {/* Backdrop */}
      <div className="notif-drawer-backdrop" onClick={onClose} aria-hidden="true" />

      {/* Drawer Container */}
      <aside className="notif-drawer-panel">
        {/* Header */}
        <div className="notif-drawer-header">
          <div className="notif-drawer-title-group">
            <div className="notif-header-icon" aria-hidden="true">
              <BellIcon />
            </div>
            <div>
              <h2 className="notif-drawer-title">Notification Center</h2>
              <span className="notif-drawer-subtitle">
                {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
              </span>
            </div>
          </div>
          <div className="notif-drawer-top-actions">
            {allNotifications.length > 0 && (
              <>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="notif-header-action-btn"
                    onClick={markAllRead}
                    title="Mark all as read"
                  >
                    <CheckCheckIcon />
                    <span>Read all</span>
                  </button>
                )}
                <button
                  type="button"
                  className="notif-header-action-btn notif-header-action-btn--danger"
                  onClick={clearAll}
                  title="Clear all notifications"
                >
                  <TrashIcon />
                  <span>Clear</span>
                </button>
              </>
            )}
            <button
              type="button"
              className="notif-drawer-close-btn"
              onClick={onClose}
              aria-label="Close notification center"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Push Notification Service Card */}
        <div className="notif-service-card">
          <div className="notif-service-card__header">
            <div className="notif-service-card__status">
              <span className={`notif-status-dot ${permissionStatus === 'granted' && settings.pushEnabled ? 'notif-status-dot--active' : ''}`} />
              <span className="notif-service-card__label">
                {permissionStatus === 'granted' && settings.pushEnabled
                  ? 'Browser Push Notifications Active'
                  : 'Daily Study Push Reminders'}
              </span>
            </div>
            <button
              type="button"
              className="notif-test-btn"
              onClick={sendTestNotification}
              title="Test push notification right now"
            >
              Test Alert 🔔
            </button>
          </div>

          {permissionStatus !== 'granted' ? (
            <div className="notif-service-card__prompt">
              <p className="notif-service-card__desc">
                Enable desktop/mobile browser notifications to receive scheduled daily reminders and protect your Java streak.
              </p>
              <button
                type="button"
                className="notif-enable-push-btn"
                onClick={enablePush}
              >
                Enable Push Notifications
              </button>
            </div>
          ) : (
            <div className="notif-service-card__controls">
              <div className="notif-schedule-row">
                <label htmlFor="notif-time-input" className="notif-schedule-label">
                  Daily Study Reminder Time:
                </label>
                <input
                  id="notif-time-input"
                  type="time"
                  className="notif-time-input"
                  value={settings.studyReminderTime || '20:00'}
                  onChange={(e) => updateSettings({ studyReminderTime: e.target.value })}
                />
              </div>
              <div className="notif-system-notice-badge" title="System notices & API alerts remain in-app only">
                <span className="notif-policy-icon" aria-hidden="true">🛡️</span>
                <span>System notices &amp; alerts remain strictly in-app (no push notification popups).</span>
              </div>
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="notif-filter-tabs" role="tablist">
          <button
            type="button"
            className={`notif-filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({allNotifications.length})
          </button>
          <button
            type="button"
            className={`notif-filter-btn ${filter === 'achievement' ? 'active' : ''}`}
            onClick={() => setFilter('achievement')}
          >
            🏆 Achievements
          </button>
          <button
            type="button"
            className={`notif-filter-btn ${filter === 'reminder' ? 'active' : ''}`}
            onClick={() => setFilter('reminder')}
          >
            ⏰ Reminders
          </button>
          <button
            type="button"
            className={`notif-filter-btn ${filter === 'system' ? 'active' : ''}`}
            onClick={() => setFilter('system')}
          >
            ⚙️ System & Alerts
          </button>
          <button
            type="button"
            className={`notif-filter-btn ${filter === 'streak' ? 'active' : ''}`}
            onClick={() => setFilter('streak')}
          >
            🔥 Streaks
          </button>
        </div>

        {/* Notification List */}
        <div className="notif-list-container">
          {notifications.length === 0 ? (
            <div className="notif-empty-state">
              <div className="notif-empty-icon" aria-hidden="true">
                <BellOffIcon />
              </div>
              <h3 className="notif-empty-title">No notifications yet</h3>
              <p className="notif-empty-desc">
                {filter === 'all'
                  ? 'Milestone achievements, study reminders, and system service alerts will appear here.'
                  : `No ${filter} notifications found.`}
              </p>
            </div>
          ) : (
            <div className="notif-list">
              {notifications.map((item) => (
                <article
                  key={item.id}
                  className={`notif-item notif-item--${item.type} ${!item.read ? 'notif-item--unread' : ''}`}
                  onClick={() => markRead(item.id)}
                >
                  <div className="notif-item__icon-wrap">
                    {item.type === 'achievement' && <TrophyIcon />}
                    {item.type === 'reminder' && <ClockIcon />}
                    {item.type === 'system' && <AlertTriangleIcon />}
                    {item.type === 'streak' && <FireIcon />}
                  </div>

                  <div className="notif-item__body">
                    <div className="notif-item__header-row">
                      <h4 className="notif-item__title">{item.title}</h4>
                      {!item.read && <span className="notif-unread-dot" title="Unread" />}
                    </div>

                    <p className="notif-item__message">{item.message}</p>

                    <div className="notif-item__footer">
                      <span className="notif-item__time">{formatNotificationTime(item.timestamp)}</span>

                      {item.actionType && (
                        <button
                          type="button"
                          className="notif-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActionClick(item);
                          }}
                        >
                          {item.actionType === 'open_badges' && 'View Badges →'}
                          {item.actionType === 'open_streak' && 'Open Streak →'}
                          {item.actionType === 'open_today' && 'Study Now →'}
                          {item.actionType === 'open_settings' && 'Open Settings →'}
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="notif-item__delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteItem(item.id);
                    }}
                    title="Remove notification"
                    aria-label="Remove notification"
                  >
                    ✕
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

/* ---- SVGs ---- */

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function BellOffIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      <path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
      <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
      <path d="M18 8a6 6 0 0 0-9.33-5" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2" />
      <path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2" />
      <path d="M6 3h12v7a6 6 0 0 1-12 0V3z" />
      <path d="M12 16v3" />
      <path d="M8 21h8" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function AlertTriangleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function FireIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2c-.5 2-2 3.5-3 5.5-1.5 3-1 6.5 1 9 0-1.5.5-2.5 1.5-3.5 1 2 2.5 3 2.5 5 2.5-1.5 4-4.5 4-7.5 0-3-2-5.5-4-7-1 2-2 2.5-2 3.5 0-2 0-3.5 0-5z" />
    </svg>
  );
}

function CheckCheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 6 9 17 4 12" />
      <polyline points="22 10 13 21 11 19" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
