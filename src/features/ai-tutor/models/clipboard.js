/**
 * Cross-Browser Clipboard Utility
 *
 * Copies text using modern Async Clipboard API (`navigator.clipboard.writeText`)
 * with fallback to `document.execCommand('copy')` for legacy browsers,
 * non-secure HTTP contexts, or environments where the modern API is unavailable.
 */

/**
 * Copies text to user clipboard.
 *
 * @param {string} text - Text to copy
 * @returns {Promise<{ success: boolean, method: string, error?: any }>}
 */
export async function copyToClipboard(text) {
  if (!text) {
    return { success: false, method: 'none', error: new Error('No text provided') };
  }

  // 1. Modern Navigator Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return { success: true, method: 'clipboard-api' };
    } catch (_err) {
      // Fall through to execCommand fallback on permission rejection or unsupported mime
    }
  }

  // 2. Legacy document.execCommand('copy') fallback
  try {
    if (typeof document !== 'undefined') {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      // Prevent scrolling to bottom of page
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '-9999px';
      textArea.style.opacity = '0';
      textArea.setAttribute('readonly', '');
      textArea.setAttribute('aria-hidden', 'true');

      document.body.appendChild(textArea);
      textArea.focus({ preventScroll: true });
      textArea.select();
      textArea.setSelectionRange(0, text.length);

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        return { success: true, method: 'execCommand' };
      }
    }
  } catch (err) {
    return { success: false, method: 'execCommand', error: err };
  }

  return {
    success: false,
    method: 'none',
    error: new Error('Clipboard operations are not supported in this browser environment.'),
  };
}

