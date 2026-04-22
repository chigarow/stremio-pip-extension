/**
 * Content Script - Stremio PiP Extension Orchestrator
 *
 * Coordinates all modules to enable Document Picture-in-Picture
 * for Stremio Web with HTML subtitle support.
 *
 * Loaded as content script alongside:
 * - dom-detector.js (findVideoContainer)
 * - css-sync.js (copyStylesheets)
 * - pip-manager.js (openPiP, closePiP, togglePiP)
 * - pip-controls.js (hideNativeControls, injectPipControls)
 * - notification.js (showError, showSuccess, notifyApiNotSupported, notifyContainerNotFound)
 */

// Handle messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'togglePiP') {
    handleTogglePiP()
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
});

/**
 * Main PiP toggle handler
 * 1. Find video container
 * 2. Toggle PiP state
 * 3. Sync CSS to PiP window
 * 4. Show success notification
 */
async function handleTogglePiP() {
  // Step 1: Find the video container
  const container = findVideoContainer();

  if (!container) {
    notifyContainerNotFound();
    return;
  }

  // Step 2: Check if closing or opening
  if (globalThis.documentPictureInPicture && globalThis.documentPictureInPicture.window) {
    // Clean up PiP controls before closing
    var currentPipWindow = globalThis.documentPictureInPicture.window;
    if (currentPipWindow && currentPipWindow._pipControlsCleanup) {
      currentPipWindow._pipControlsCleanup();
    }
    closePiP();
    showSuccess('PiP mode deactivated');
    return;
  }

  // Step 3: Check API support
  if (!globalThis.documentPictureInPicture) {
    notifyApiNotSupported();
    return;
  }

  try {
    // Step 4: Open PiP window
    const pipWindow = await openPiP(container);

    // Step 5: Copy stylesheets to PiP window
    copyStylesheets(pipWindow.document);

    // Step 6: Hide Stremio native controls in PiP
    hideNativeControls(pipWindow.document);

    // Step 7: Inject custom PiP controls
    injectPipControls(pipWindow, container);

    // Step 8: Show success notification
    showSuccess('PiP mode activated');
  } catch (error) {
    showError('Failed to open PiP: ' + error.message);
  }
}
