/**
 * Global Toast Event Dispatcher
 * Allows any ViewModel, Service, or Component to trigger toast notifications.
 */

let toastIdCounter = 0;

export function showToast(message, type = 'info', duration = 3000) {
  if (typeof window === 'undefined') return;
  const event = new CustomEvent('jct:toast', {
    detail: {
      id: ++toastIdCounter,
      message,
      type, // 'info' | 'success' | 'warning'
      duration,
    },
  });
  window.dispatchEvent(event);
}
