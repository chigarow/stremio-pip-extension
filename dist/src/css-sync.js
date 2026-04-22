/**
 * CSS Sync - Copy stylesheets to Document PiP window
 *
 * Comprehensive approach:
 * 1. Copy inline <style> tags (cssRules)
 * 2. Copy external <link rel="stylesheet"> tags
 * 3. Handle CORS-protected stylesheets gracefully
 */

/**
 * Copy all stylesheets from source document to target document
 * @param {Document} targetDoc - The target document (PiP window document)
 */
function copyStylesheets(targetDoc) {
  // Track hrefs already added to prevent duplicates
  const addedHrefs = new Set();

  // First, copy stylesheets from document.styleSheets API
  const styleSheets = document.styleSheets;

  for (let i = 0; i < styleSheets.length; i++) {
    const styleSheet = styleSheets[i];

    // Check if this is an external stylesheet (has href)
    if (styleSheet.href) {
      // Skip if already added
      if (addedHrefs.has(styleSheet.href)) continue;
      addedHrefs.add(styleSheet.href);

      // External stylesheet - create link element
      const link = targetDoc.createElement('link');
      link.rel = 'stylesheet';
      link.type = styleSheet.type || 'text/css';
      link.href = styleSheet.href;

      if (styleSheet.media) {
        link.media = styleSheet.media;
      }

      targetDoc.head.appendChild(link);
    } else {
      // Inline stylesheet - copy cssRules
      try {
        const cssRules = styleSheet.cssRules;

        if (cssRules && cssRules.length > 0) {
          // Convert rules to CSS text
          const cssText = Array.from(cssRules)
            .map(rule => rule.cssText)
            .join('');

          // Create style element in target document
          const style = targetDoc.createElement('style');
          style.textContent = cssText;
          targetDoc.head.appendChild(style);
        }
      } catch (e) {
        // CORS error or other issue - skip this stylesheet
        // Inline styles without accessible cssRules are skipped
      }
    }
  }

  // Also copy external link elements directly (for jsdom compatibility)
  // Skip any that were already added via styleSheets API
  const linkElements = document.querySelectorAll('link[rel="stylesheet"]');
  linkElements.forEach((linkEl) => {
    // Skip if already added
    if (addedHrefs.has(linkEl.href)) return;
    addedHrefs.add(linkEl.href);

    const link = targetDoc.createElement('link');
    link.rel = 'stylesheet';
    link.type = linkEl.type || 'text/css';
    link.href = linkEl.href;

    if (linkEl.media) {
      link.media = linkEl.media;
    }

    targetDoc.head.appendChild(link);
  });
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { copyStylesheets };
}
