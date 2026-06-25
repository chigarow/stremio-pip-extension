/**
 * DOM Detector - Find Stremio Web video container
 *
 * Uses dual selector strategy:
 * 1. Primary: Class pattern matching (handles CSS Module hashes)
 * 2. Fallback: Structural heuristics (walks DOM from video element)
 */

/**
 * Find the video container element that holds both video and subtitle overlay
 * @returns {HTMLDivElement|null} The container element or null if not found
 */
function findVideoContainer() {
  // Primary strategy: Class pattern matching
  // Try most specific selectors first, then more general ones
  const selectors = [
    '[class*="video-tkpQm"]',  // Exact match from screenshot
    '[class^="video-"]',        // CSS Module hash pattern
    '[class*="video-container"]' // Partial match
  ];
  
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    for (const el of elements) {
      // Verify it contains a video element
      if (el.querySelector('video')) {
        return el;
      }
    }
  }

  // Fallback strategy: Structural heuristics
  const video = document.querySelector('video');
  if (!video) {
    return null;
  }

  // Walk up from video element to find container with subtitle sibling
  let container = video.parentElement;
  while (container && container !== document.body && container !== document.documentElement) {
    // Check if this container has a subtitle sibling
    const hasSubtitleSibling = Array.from(container.children).some(child => {
      // Skip the video element itself
      if (child === video) return false;

      // Subtitle overlay: DIV with absolute positioning and numeric z-index >= 1
      // Note: only inline style is checked. Subtitle overlays styled solely via
      // external stylesheets (no inline style attr) cannot be detected here —
      // primary class-based selectors above handle that case.
      var isDiv = child.tagName === 'DIV';
      var style = child.style || {};
      var position = style.position;
      var zIndex = parseInt(style.zIndex, 10);
      return isDiv &&
             position === 'absolute' &&
             !isNaN(zIndex) &&
             zIndex >= 1;
    });

    if (hasSubtitleSibling) {
      return container;
    }

    container = container.parentElement;
  }

  return null;
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { findVideoContainer };
}
