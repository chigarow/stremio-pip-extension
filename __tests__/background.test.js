/**
 * @jest-environment jsdom
 */
const { describe, it, expect, beforeEach } = require('@jest/globals');
const path = require('path');
const fs = require('fs');

describe('Background service worker', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  describe('CONTENT_SCRIPTS fallback list', () => {
    it('should match manifest.json content_scripts.js exactly (no drift)', () => {
      const manifestPath = path.resolve(__dirname, '..', 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const manifestScripts = manifest.content_scripts[0].js;

      // Reload background.js after mock setup so addListener doesn't throw
      const { CONTENT_SCRIPTS } = require('../background.js');

      expect(CONTENT_SCRIPTS).toEqual(manifestScripts);
    });

    it('should include src/pip-controls.js (regression guard)', () => {
      const { CONTENT_SCRIPTS } = require('../background.js');
      expect(CONTENT_SCRIPTS).toContain('src/pip-controls.js');
    });

    it('should preserve manifest load order (dom-detector first, content last)', () => {
      const { CONTENT_SCRIPTS } = require('../background.js');
      expect(CONTENT_SCRIPTS[0]).toBe('src/dom-detector.js');
      expect(CONTENT_SCRIPTS[CONTENT_SCRIPTS.length - 1]).toBe('src/content.js');
    });
  });
});
