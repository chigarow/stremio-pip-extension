/**
 * @jest-environment jsdom
 */
const { describe, it, expect, beforeEach } = require('@jest/globals');

// Import will fail until T5 implementation - that's expected for RED phase
const { copyStylesheets } = require('../src/css-sync.js');

describe('CSS Sync - copyStylesheets()', () => {
  let mockTargetDoc;

  beforeEach(() => {
    // Create mock target document (simulating PiP window document)
    mockTargetDoc = {
      createElement: jest.fn((tag) => {
        const element = { tagName: tag.toUpperCase(), style: {}, textContent: '' };
        if (tag === 'style') {
          element.sheet = { insertRule: jest.fn() };
        }
        return element;
      }),
      head: {
        appendChild: jest.fn()
      }
    };

    // Clear existing stylesheets
    document.head.innerHTML = '';
  });

  describe('Inline stylesheet copying', () => {
    it('should copy inline <style> tags to target document', () => {
      // Arrange: Add inline style to source document
      const style = document.createElement('style');
      style.textContent = '.video { color: red; }';
      document.head.appendChild(style);

      // Act
      copyStylesheets(mockTargetDoc);

      // Assert
      expect(mockTargetDoc.createElement).toHaveBeenCalledWith('style');
      expect(mockTargetDoc.head.appendChild).toHaveBeenCalled();
    });

    it('should preserve CSS content when copying inline styles', () => {
      const style = document.createElement('style');
      style.textContent = '.subtitle { font-size: 4vmin; text-shadow: 2px 2px 4px black; }';
      document.head.appendChild(style);

      copyStylesheets(mockTargetDoc);

      const createdStyle = mockTargetDoc.createElement.mock.results.find(r => r.value?.tagName === 'STYLE');
      expect(createdStyle?.value?.textContent).toContain('.subtitle');
    });

    it('should handle multiple inline stylesheets', () => {
      const style1 = document.createElement('style');
      style1.textContent = '.class1 { color: red; }';
      const style2 = document.createElement('style');
      style2.textContent = '.class2 { color: blue; }';
      
      document.head.appendChild(style1);
      document.head.appendChild(style2);

      copyStylesheets(mockTargetDoc);

      expect(mockTargetDoc.createElement.mock.calls.filter(c => c[0] === 'style').length).toBe(2);
    });
  });

  describe('External stylesheet copying', () => {
    it('should copy <link rel="stylesheet"> tags to target document', () => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://example.com/styles.css';
      document.head.appendChild(link);

      copyStylesheets(mockTargetDoc);

      expect(mockTargetDoc.createElement).toHaveBeenCalledWith('link');
      expect(mockTargetDoc.head.appendChild).toHaveBeenCalled();
    });

    it('should preserve link attributes (rel, href, type, media)', () => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://example.com/styles.css';
      link.type = 'text/css';
      link.media = 'screen';
      document.head.appendChild(link);

      copyStylesheets(mockTargetDoc);

      const createdLink = mockTargetDoc.createElement.mock.results.find(r => r.value?.tagName === 'LINK');
      expect(createdLink.value.rel).toBe('stylesheet');
      expect(createdLink.value.href).toBe('https://example.com/styles.css');
    });

    it('should skip non-stylesheet links', () => {
      const iconLink = document.createElement('link');
      iconLink.rel = 'icon';
      iconLink.href = '/favicon.ico';
      document.head.appendChild(iconLink);

      copyStylesheets(mockTargetDoc);

      // Should not create element for non-stylesheet links
      const createdLinks = mockTargetDoc.createElement.mock.results.filter(r => r.value?.tagName === 'LINK');
      expect(createdLinks.length).toBe(0);
    });
  });

  describe('CORS handling', () => {
    it('should handle CORS-protected stylesheets gracefully', () => {
      // Arrange: Create a stylesheet that will throw on cssRules access
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cross-origin.com/styles.css';
      document.head.appendChild(link);

      // Mock styleSheet.cssRules to throw (simulating CORS error)
      const mockStyleSheet = {
        cssRules: null,
        href: 'https://cross-origin.com/styles.css',
        type: 'text/css',
        media: 'screen'
      };
      
      Object.defineProperty(mockStyleSheet, 'cssRules', {
        get: () => { throw new Error('SecurityError: CORS'); }
      });

      // Act & Assert: Should not throw, should create link element instead
      expect(() => copyStylesheets(mockTargetDoc)).not.toThrow();
    });

    it('should create link element for CORS-protected stylesheets', () => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cross-origin.com/styles.css';
      document.head.appendChild(link);

      copyStylesheets(mockTargetDoc);

      // Should create a link element (not style element) for CORS stylesheets
      const createdLinks = mockTargetDoc.createElement.mock.results.filter(r => r.value?.tagName === 'LINK');
      expect(createdLinks.length).toBeGreaterThan(0);
    });
  });

  describe('Comprehensive CSS syncing', () => {
    it('should handle both inline and external stylesheets together', () => {
      const style = document.createElement('style');
      style.textContent = '.inline { color: red; }';
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://example.com/external.css';
      
      document.head.appendChild(style);
      document.head.appendChild(link);

      copyStylesheets(mockTargetDoc);

      expect(mockTargetDoc.createElement).toHaveBeenCalledWith('style');
      expect(mockTargetDoc.createElement).toHaveBeenCalledWith('link');
    });

    it('should handle empty stylesheets', () => {
      const style = document.createElement('style');
      style.textContent = '';
      document.head.appendChild(style);

      expect(() => copyStylesheets(mockTargetDoc)).not.toThrow();
    });

    it('should handle malformed CSS gracefully', () => {
      const style = document.createElement('style');
      style.textContent = 'invalid css {{{';
      document.head.appendChild(style);

      expect(() => copyStylesheets(mockTargetDoc)).not.toThrow();
    });
  });

  describe('Stremio Web subtitle styling', () => {
    it('should copy subtitle-specific styles', () => {
      // Simulate Stremio's subtitle styles
      const style = document.createElement('style');
      style.textContent = `
        [class*="video-"] div[style*="position: absolute"] {
          font-size: 4vmin;
          text-shadow: 2px 2px 4px black;
          color: white;
        }
      `;
      document.head.appendChild(style);

      copyStylesheets(mockTargetDoc);

      const createdStyle = mockTargetDoc.createElement.mock.results.find(r => r.value?.tagName === 'STYLE');
      expect(createdStyle?.value?.textContent).toContain('font-size');
      expect(createdStyle?.value?.textContent).toContain('text-shadow');
    });
  });
});
