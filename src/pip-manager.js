/**
 * PiP Manager - Document Picture-in-Picture Lifecycle
 *
 * Manages the Document PiP window lifecycle:
 * 1. Open PiP window with correct dimensions
 * 2. Move container (video + subtitles) to PiP
 * 3. Listen for pagehide to restore elements
 * 4. Toggle between open/closed states
 */

let originalParent = null;

/**
 * Open Document PiP window and move container into it
 * @param {HTMLElement} container - The video container to move to PiP
 * @returns {Promise<Window>} The PiP window
 */
async function openPiP(container) {
  if (!container) {
    throw new Error('Container is required');
  }

  if (!globalThis.documentPictureInPicture) {
    throw new Error('Document Picture-in-Picture API not supported');
  }

  // Store original parent for restoration
  originalParent = container.parentElement;

  // Request PiP window with container dimensions
  const pipWindow = await globalThis.documentPictureInPicture.requestWindow({
    width: container.clientWidth,
    height: container.clientHeight
  });

  // Move container to PiP window (not clone - preserves video state)
  pipWindow.document.body.append(container);

  // Listen for pagehide to restore elements
  pipWindow.addEventListener('pagehide', () => {
    if (originalParent) {
      originalParent.append(container);
    }
    originalParent = null;
  });

  return pipWindow;
}

/**
 * Close PiP window if open
 */
function closePiP() {
  if (globalThis.documentPictureInPicture && globalThis.documentPictureInPicture.window) {
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
  module.exports = { openPiP, closePiP, togglePiP };
}
