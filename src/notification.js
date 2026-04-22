/**
 * Notification module for Stremio PiP extension
 * Handles user notifications via Chrome notifications API
 */

// Icon URL for notifications
const ICON_URL = 'icons/icon48.png';

/**
 * Shows an error notification to the user
 * @param {string} message - The error message to display
 */
function showError(message) {
  if (typeof chrome === 'undefined' || !chrome.notifications) {
    console.warn('Chrome notifications API not available:', message);
    return;
  }

  const notificationId = 'error-' + Date.now();
  chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: ICON_URL,
    title: 'Stremio PiP',
    message: message
  });
}

/**
 * Shows a success notification to the user
 * @param {string} message - The success message to display
 */
function showSuccess(message) {
  if (typeof chrome === 'undefined' || !chrome.notifications) {
    console.warn('Chrome notifications API not available:', message);
    return;
  }

  const notificationId = 'success-' + Date.now();
  chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: ICON_URL,
    title: 'Stremio PiP',
    message: message
  });

  // Auto-dismiss after 3 seconds
  setTimeout(() => {
    if (chrome.notifications && chrome.notifications.clear) {
      chrome.notifications.clear(notificationId);
    }
  }, 3000);
}

/**
 * Notifies the user that the Document Picture-in-Picture API is not supported
 */
function notifyApiNotSupported() {
  showError('Document Picture-in-Picture API is not supported. Please update to Chrome 116+ or upgrade your browser.');
}

/**
 * Notifies the user that the video container was not found
 */
function notifyContainerNotFound() {
  showError('Video container not found. Please open a video in Stremio first to start PiP mode.');
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { showError, showSuccess, notifyApiNotSupported, notifyContainerNotFound };
}
