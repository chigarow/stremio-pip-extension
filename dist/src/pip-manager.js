/**
 * PiP Manager - Document Picture-in-Picture Lifecycle
 *
 * Manages the Document PiP window lifecycle:
 * 1. Open PiP window with correct dimensions
 * 2. Move container (video + subtitles) to PiP
 * 3. Listen for pagehide to restore elements
 * 4. Toggle between open/closed states
 *
 * Concurrency: a single inFlightAction guard prevents the rapid-toggle
 * race where a second icon click during an async requestWindow()/pagehide
 * gap could yank the container out of a freshly-opened PiP window.
 */

let originalParent = null;
let inFlightAction = null; // null | 'opening' | 'closing'

/**
 * Open Document PiP window and move container into it
 * @param {HTMLElement} container - The video container to move to PiP
 * @returns {Promise<Window>} The PiP window
 * @throws {Error} if a PiP open/close is already in flight, container is
 *   missing, or the Document PiP API is unavailable
 */
async function openPiP(container) {
  if (inFlightAction === 'opening') {
    throw new Error('PiP open already in progress');
  }
  if (inFlightAction === 'closing') {
    throw new Error('PiP close already in progress');
  }
  if (!container) {
    throw new Error('Container is required');
  }
  if (!globalThis.documentPictureInPicture) {
    throw new Error('Document Picture-in-Picture API not supported');
  }

  // Reserve the opening slot for the duration of the async requestWindow()
  inFlightAction = 'opening';
  originalParent = container.parentElement;

  try {
    // Request PiP window with container dimensions
    const pipWindow = await globalThis.documentPictureInPicture.requestWindow({
      width: container.clientWidth,
      height: container.clientHeight
    });

    // Move container to PiP window (not clone - preserves video state)
    pipWindow.document.body.append(container);

    // Listen for pagehide to restore elements (fires once, auto-cleaned)
    pipWindow.addEventListener('pagehide', () => {
      // Clean up PiP controls listeners before restoring
      if (pipWindow._pipControlsCleanup) {
        pipWindow._pipControlsCleanup();
      }
      if (originalParent) {
        originalParent.append(container);
      }
      originalParent = null;
      inFlightAction = null; // closing finished
    }, { once: true });

    inFlightAction = null; // opening complete, ready for next action
    return pipWindow;
  } catch (error) {
    // Reset state on failure (e.g., user denied PiP, browser error)
    originalParent = null;
    inFlightAction = null;
    throw error;
  }
}

/**
 * Close PiP window if open. Idempotent and safe to call during an opening
 * (no-op in that case since there is not yet a window to close).
 * The inFlightAction='closing' flag is cleared by the pagehide handler
 * registered in openPiP() once restoration completes.
 */
function closePiP() {
  if (inFlightAction === 'opening') {
    // Open is in flight — no PiP window exists yet to close. Silent no-op.
    return;
  }
  if (inFlightAction === 'closing') {
    // Already closing — idempotent.
    return;
  }
  if (globalThis.documentPictureInPicture && globalThis.documentPictureInPicture.window) {
    inFlightAction = 'closing';
    globalThis.documentPictureInPicture.window.close();
  }
}

/**
 * Toggle PiP state (open/close)
 * @param {HTMLElement} container - The video container (required for opening)
 * @returns {Promise<void>}
 */
async function togglePiP(container) {
  if (globalThis.documentPictureInPicture && globalThis.documentPictureInPicture.window) {
    closePiP();
  } else {
    if (!container) {
      throw new Error('Container is required to open PiP');
    }
    await openPiP(container);
  }
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  // _resetState is test-only: clears in-flight flags so test cases don't
  // leak state across each other.
  module.exports = {
    openPiP,
    closePiP,
    togglePiP,
    _resetState: function() { inFlightAction = null; originalParent = null; }
  };
}
