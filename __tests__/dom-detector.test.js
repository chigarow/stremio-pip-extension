/**
 * @jest-environment jsdom
 */
const { describe, it, expect, beforeEach } = require('@jest/globals');

// Import will fail until T3 implementation - that's expected for RED phase
const { findVideoContainer } = require('../src/dom-detector.js');

describe('DOM Detector - findVideoContainer()', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('Primary selector - class pattern matching', () => {
    it('should find container by exact class video-tkpQm', () => {
      // Arrange: Stremio-like DOM structure
      const container = document.createElement('div');
      container.className = 'video-tkpQm';
      const video = document.createElement('video');
      video.className = 'noselect';
      container.appendChild(video);
      document.body.appendChild(container);

      // Act
      const result = findVideoContainer();

      // Assert
      expect(result).toBe(container);
    });

    it('should find container by partial class match video-container', () => {
      const container = document.createElement('div');
      container.className = 'video-container-v9_vA';
      const video = document.createElement('video');
      container.appendChild(video);
      document.body.appendChild(container);

      const result = findVideoContainer();
      expect(result).toBe(container);
    });

    it('should handle CSS Module hash changes (e.g., video-abc12)', () => {
      const container = document.createElement('div');
      container.className = 'video-abc12';
      const video = document.createElement('video');
      container.appendChild(video);
      document.body.appendChild(container);

      const result = findVideoContainer();
      expect(result).toBe(container);
    });
  });

  describe('Fallback selector - structural heuristics', () => {
    it('should find container by walking up from video element', () => {
      // Arrange: No class names, but structure matches
      const container = document.createElement('div');
      const video = document.createElement('video');
      const subtitleDiv = document.createElement('div');
      subtitleDiv.style.position = 'absolute';
      subtitleDiv.style.zIndex = '1';
      
      container.appendChild(video);
      container.appendChild(subtitleDiv);
      document.body.appendChild(container);

      const result = findVideoContainer();
      expect(result).toBe(container);
    });

    it('should identify container with subtitle sibling by inline styles', () => {
      const container = document.createElement('div');
      const video = document.createElement('video');
      const subtitleDiv = document.createElement('div');
      subtitleDiv.setAttribute('style', 'position: absolute; z-index: 1;');
      
      container.appendChild(video);
      container.appendChild(subtitleDiv);
      document.body.appendChild(container);

      const result = findVideoContainer();
      expect(result).toBe(container);
    });

    it('should walk up multiple DOM levels to find container', () => {
      // Arrange: Deeply nested structure - video is 3 levels deep
      const outerWrapper = document.createElement('div');
      const middleWrapper = document.createElement('div');
      const innerWrapper = document.createElement('div');
      
      const container = document.createElement('div');
      const video = document.createElement('video');
      const subtitleDiv = document.createElement('div');
      subtitleDiv.style.position = 'absolute';
      subtitleDiv.style.zIndex = '1';
      
      container.appendChild(video);
      container.appendChild(subtitleDiv);
      innerWrapper.appendChild(container);
      middleWrapper.appendChild(innerWrapper);
      outerWrapper.appendChild(middleWrapper);
      document.body.appendChild(outerWrapper);
      
      // Act
      const result = findVideoContainer();
      
      // Assert - should walk up from video through innerWrapper, middleWrapper to find container
      expect(result).toBe(container);
    });

    it('should return null when walking up entire tree without finding subtitle sibling', () => {
      // Arrange: Video exists but no subtitle overlay anywhere in the tree
      const wrapper = document.createElement('div');
      const container = document.createElement('div');
      const video = document.createElement('video');
      const otherDiv = document.createElement('div');
      otherDiv.style.position = 'absolute';
      // Missing zIndex - should not match
      
      container.appendChild(video);
      container.appendChild(otherDiv);
      wrapper.appendChild(container);
      document.body.appendChild(wrapper);
      
      // Act
      const result = findVideoContainer();
      
      // Assert
      expect(result).toBeNull();
    });

    it('should ignore non-DIV siblings with position:absolute', () => {
      // Arrange: Non-DIV element with absolute positioning should be ignored
      const container = document.createElement('div');
      const video = document.createElement('video');
      const spanOverlay = document.createElement('span');
      spanOverlay.style.position = 'absolute';
      spanOverlay.style.zIndex = '1';
      
      container.appendChild(video);
      container.appendChild(spanOverlay);
      document.body.appendChild(container);
      
      // Act
      const result = findVideoContainer();
      
      // Assert - should not match because it's a SPAN, not a DIV
      expect(result).toBeNull();
    });


    it('should handle z-index as string with includes check', () => {
      // Arrange: zIndex as string that includes '1' but not exact match
      const container = document.createElement('div');
      const video = document.createElement('video');
      const subtitleDiv = document.createElement('div');
      subtitleDiv.style.position = 'absolute';
      subtitleDiv.style.zIndex = '10'; // Contains '1' but not exact '1'
      
      container.appendChild(video);
      container.appendChild(subtitleDiv);
      document.body.appendChild(container);
      
      // Act
      const result = findVideoContainer();
      
      // Assert - should match because '10'.includes('1') is true
      expect(result).toBe(container);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should return null when no video element exists', () => {
      document.body.innerHTML = '<div>No video here</div>';
      const result = findVideoContainer();
      expect(result).toBeNull();
    });

    it('should return null when video exists but no container with subtitle', () => {
      const video = document.createElement('video');
      document.body.appendChild(video);
      const result = findVideoContainer();
      expect(result).toBeNull();
    });

    it('should return null on empty DOM', () => {
      const result = findVideoContainer();
      expect(result).toBeNull();
    });

    it('should handle dynamically loaded content', () => {
      // Initially empty
      expect(findVideoContainer()).toBeNull();
      
      // Add content dynamically
      const container = document.createElement('div');
      container.className = 'video-tkpQm';
      const video = document.createElement('video');
      container.appendChild(video);
      document.body.appendChild(container);
      
      // Should now find it
      expect(findVideoContainer()).toBe(container);
    });
  });

  describe('Stremio Web DOM structure simulation', () => {
    it('should match actual Stremio Web structure from screenshot', () => {
      // Recreate exact structure from user's screenshot
      const playerContainer = document.createElement('div');
      playerContainer.className = 'player-container-wIELK overlayHidden-gyJIy';
      
      const layer = document.createElement('div');
      layer.className = 'layer-qaLDW video-container-v9_vA';
      layer.style.position = 'relative';
      layer.style.zIndex = '0';
      
      const videoContainer = document.createElement('div');
      videoContainer.className = 'video-tkpQm';
      videoContainer.style.position = 'relative';
      videoContainer.style.zIndex = '0';
      
      const subtitleOverlay = document.createElement('div');
      subtitleOverlay.style.cssText = 'position: absolute; right: 0px; bottom: 5%; left: 0px; z-index: 1; text-align: center; opacity: 1;';
      const subtitleText = document.createElement('div');
      subtitleText.textContent = 'Test subtitle';
      subtitleOverlay.appendChild(subtitleText);
      
      const video = document.createElement('video');
      video.playsInline = true;
      video.className = 'noselect';
      video.style.cssText = 'width: 100%; height: 100%; background-color: black;';
      
      videoContainer.appendChild(subtitleOverlay);
      videoContainer.appendChild(video);
      layer.appendChild(videoContainer);
      playerContainer.appendChild(layer);
      document.body.appendChild(playerContainer);

      const result = findVideoContainer();
      expect(result).toBe(videoContainer);
    });
  });
});
