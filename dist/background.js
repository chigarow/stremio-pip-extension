/**
 * Background Service Worker - Stremio PiP Extension
 * 
 * Handles extension icon click and sends toggle message to content script.
 * Uses chrome.scripting API to inject content script if not already loaded.
 */

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
          files: [
            'src/dom-detector.js',
            'src/css-sync.js',
            'src/pip-manager.js',
            'src/notification.js',
            'src/content.js'
          ]
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
