/**
 * Notification module for Stremio PiP extension
 * Relays notification requests to background.js via chrome.runtime.sendMessage.
 * MV3 content scripts cannot access chrome.notifications directly;
 * the background service worker owns the chrome.notifications API.
 */

/**
 * Relays a notification request to the background service worker.
 * @param {string} kind - 'error' or 'success'
 * @param {string} message - The notification message
 * @param {boolean} autoDismiss - Whether to auto-dismiss after 3 seconds
 */
function relayNotification(kind, message, autoDismiss) {
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
    console.warn('Stremio PiP: cannot relay notification:', message);
    return;
  }

  chrome.runtime.sendMessage({
    action: 'notify',
    kind: kind,
    message: message,
    autoDismiss: autoDismiss
  });
}

/**
 * Shows an error notification to the user
 * @param {string} message - The error message to display
 */
function showError(message) {
  relayNotification('error', message, false);
}

/**
 * Shows a success notification to the user.
 * Auto-dismiss is scheduled on the content-script side: MV3 service workers can
 * be terminated after sendResponse returns, so any setTimeout scheduled inside
 * the worker is unreliable. The content script lives as long as the page, so
 * it sends a follow-up 'clearNotification' message after 3s.
 * @param {string} message - The success message to display
 */
function showSuccess(message) {
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
    console.warn('Stremio PiP: cannot relay notification:', message);
    return;
  }

  chrome.runtime.sendMessage(
    {
      action: 'notify',
      kind: 'success',
      message: message
    },
    function(response) {
      if (response && response.success && response.notificationId) {
        setTimeout(function() {
          chrome.runtime.sendMessage({
            action: 'clearNotification',
            notificationId: response.notificationId
          });
        }, 3000);
      }
    }
  );
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
