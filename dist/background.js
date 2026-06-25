/**
 * Background Service Worker - Stremio PiP Extension
 *
 * Handles extension icon click and sends toggle message to content script.
 * Uses chrome.scripting API to inject content script if not already loaded.
 */

/**
 * Content script files in load order (must match manifest.json content_scripts[0].js).
 * Kept in sync via __tests__/background.test.js drift guard.
 * @type {string[]}
 */
const CONTENT_SCRIPTS = [
  'src/dom-detector.js',
  'src/css-sync.js',
  'src/pip-manager.js',
  'src/pip-controls.js',
  'src/notification.js',
  'src/content.js'
];

/**
 * Handles notification requests from content scripts.
 * Content scripts cannot access chrome.notifications directly in MV3,
 * so they relay via chrome.runtime.sendMessage to this background worker.
 * @param {Object} request - The notification request payload
 * @param {string} request.kind - 'error' or 'success'
 * @param {string} request.message - The notification message
 * @returns {{success: boolean, notificationId?: string, error?: string}}
 */
function handleNotificationRequest(request) {
  if (!chrome.notifications || typeof chrome.notifications.create !== 'function') {
    return { success: false, error: 'chrome.notifications API not available' };
  }

  const notificationId = request.kind + '-' + Date.now();
  chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'Stremio PiP',
    message: request.message
  });

  // Auto-dismiss is no longer scheduled here. The MV3 service worker can be
  // terminated by Chrome after sendResponse returns, so any setTimeout scheduled
  // inside this function is unreliable. The content script (which lives as long
  // as the page) sends a follow-up 'clearNotification' message after 3s.

  return { success: true, notificationId: notificationId };
}

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'clearNotification') {
    if (chrome.notifications && typeof chrome.notifications.clear === 'function') {
      chrome.notifications.clear(request.notificationId);
    }
    sendResponse({ success: true });
    return false; // Synchronous response: channel does not need to stay open.
  }
  if (request.action === 'notify') {
    const result = handleNotificationRequest(request);
    sendResponse(result);
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Check if we're on Stremio Web
    if (!tab.url || !tab.url.includes('web.stremio.com')) {
      console.warn('Stremio PiP: Not on Stremio Web page');
      return;
    }

    // Send toggle message to content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'togglePiP'
    });

    if (response && !response.success) {
      console.error('Stremio PiP: Toggle failed -', response.error);
    }
  } catch (error) {
    // Content script might not be loaded yet, try injecting
    if (error.message && error.message.includes('Could not establish connection')) {
      try {
        // Inject content scripts manually
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: CONTENT_SCRIPTS
        });

        // Send toggle message again after injection
        await chrome.tabs.sendMessage(tab.id, {
          action: 'togglePiP'
        });
      } catch (injectError) {
        console.error('Stremio PiP: Failed to inject scripts -', injectError.message);
      }
    } else {
      console.error('Stremio PiP: Error -', error.message);
    }
  }
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONTENT_SCRIPTS, handleNotificationRequest };
}
